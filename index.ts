/**
 * Snowball CLI — Xueqiu stock data for AI agents
 * All output is JSON. Pipe to jq or use in agent scripts.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  DATA_DIR,
  saveToken,
  loadToken,
  verifyToken,
} from "./lib/auth";
import { qrLogin, hasLoginCookie, getWafCookies, parseLoginTimeoutMs } from "./lib/qr-terminal";
import { ensureChrome, openXueqiuTab, stopStartedXvfb } from "./lib/browser";
import {
  normalizeAreaCode,
  normalizePhone,
  parseCaptchaClicks,
  runPhoneLogin,
  writeCaptchaClicks,
  writeSmsCode,
} from "./lib/sms";
import * as api from "./lib/api";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CDP_URL = process.argv.find((_, i, a) => a[i - 1] === "--cdp") ?? "http://127.0.0.1:9222";
const MODE = process.argv[2];
const VERSION = "0.3.2";

// ═══════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════

function showLogo() {
  for (const base of [__dirname, join(__dirname, "..")]) {
    try { console.log(readFileSync(join(base, "lib", "logo.ansi"), "utf-8")); return; } catch {}
  }
}

function out(data: any) {
  console.log(JSON.stringify(data, null, 2));
}

function arg(n: number): string | undefined {
  return process.argv[n + 2]; // argv[0]=bun, argv[1]=script, argv[2]=command
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function requireArg(n: number, usage: string): string {
  const v = arg(n);
  if (!v || v.startsWith("-")) {
    console.error(`\n  ${usage}\n`);
    process.exit(1);
  }
  return v;
}

function count(def = 10): number {
  return parseInt(flag("count") ?? String(def));
}

function symbols(): string[] {
  return process.argv.slice(4).filter(a => !a.startsWith("-"));
}

// ═══════════════════════════════════════════════════════════════
//  Chrome / Login helpers
// ═══════════════════════════════════════════════════════════════

async function readConfirmedLogin(cdpUrl: string): Promise<string> {
  const cookie = await getWafCookies(cdpUrl);
  if (!hasLoginCookie(cookie)) {
    throw new Error("missing xq_is_login");
  }
  return cookie;
}

/** Manual login. A TTY waits for ENTER; otherwise poll Chrome until the session cookie appears. */
async function waitForManualLogin(cdpUrl: string, timeoutMs: number): Promise<string> {
  if (process.stdin.isTTY) {
    console.log("  Please login in the Chrome window:");
    console.log("    1. Click 登录 → 2. Scan QR → 3. Press ENTER\n");
    process.stdout.write("  Press ENTER > ");
    for await (const _ of console) break;
    try {
      return await readConfirmedLogin(cdpUrl);
    } catch {
      throw new Error(
        "Chrome does not have a Xueqiu login yet (missing xq_is_login). " +
          "Confirm in the app, then press ENTER again.",
      );
    }
  }

  console.log("  stdin is not a TTY, so there is no ENTER prompt.");
  console.log(`  Waiting until the Xueqiu login cookie appears in Chrome (${Math.round(timeoutMs / 1000)}s)...\n`);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      return await readConfirmedLogin(cdpUrl);
    } catch {
      // Page may still be loading, or the user has not confirmed yet.
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for Xueqiu login (stdin is not a TTY).");
}

// ═══════════════════════════════════════════════════════════════
//  Command registry
// ═══════════════════════════════════════════════════════════════

interface Command {
  usage: string;
  desc: string;
  run: () => Promise<void>;
}

const commands: Record<string, Record<string, Command>> = {

  // ── Auth ──────────────────────────────────────────────────────
  "Auth": {
    login: {
      usage: "login [--phone <number>] [--area-code <code>] [--sms-code <code>] [--captcha-click <x,y>] [--qr-png <path>] [--timeout <sec>]",
      desc: "QR login, or phone + SMS (code from another shell)",
      run: async () => {
        const qrPng = flag("qr-png");
        const phoneRaw = flag("phone");
        const smsCode = flag("sms-code");
        const captchaClick = flag("captcha-click");
        const areaRaw = flag("area-code");
        if (hasFlag("qr-png") && (!qrPng || qrPng.startsWith("-"))) {
          console.error("\n  Usage: snowball login --qr-png <path.png>\n");
          process.exit(1);
        }
        if (hasFlag("phone") && (!phoneRaw || phoneRaw.startsWith("-"))) {
          console.error("\n  Usage: snowball login --phone <number> [--area-code 86]\n");
          process.exit(1);
        }
        if (hasFlag("sms-code") && (!smsCode || smsCode.startsWith("-"))) {
          console.error("\n  Usage: snowball login --sms-code <code>\n");
          process.exit(1);
        }
        if (hasFlag("captcha-click") && (!captchaClick || captchaClick.startsWith("-"))) {
          console.error("\n  Usage: snowball login --captcha-click <x,y>\n");
          process.exit(1);
        }
        if (hasFlag("area-code") && (!areaRaw || areaRaw.startsWith("-"))) {
          console.error("\n  Usage: snowball login --area-code <code>   (default 86)\n");
          process.exit(1);
        }
        if ((smsCode || captchaClick) && (phoneRaw || hasFlag("manual") || qrPng)) {
          console.error("\n  Run --sms-code and --captcha-click in a separate snowball login command.\n");
          process.exit(1);
        }
        if (smsCode && captchaClick) {
          console.error("\n  Pass --sms-code and --captcha-click as separate commands.\n");
          process.exit(1);
        }
        if (smsCode) {
          writeSmsCode(DATA_DIR, smsCode);
          console.log("SMS_CODE_WRITTEN=1");
          return;
        }
        if (captchaClick) {
          parseCaptchaClicks(captchaClick);
          const count = writeCaptchaClicks(DATA_DIR, captchaClick);
          console.log(`CAPTCHA_CLICK=${count}`);
          return;
        }

        const timeoutRaw = flag("timeout");
        if (hasFlag("timeout") && (!timeoutRaw || timeoutRaw.startsWith("-"))) {
          console.error("\n  Usage: snowball login --timeout <seconds>   (default 600)\n");
          process.exit(1);
        }
        let timeoutMs: number;
        try {
          timeoutMs = parseLoginTimeoutMs(timeoutRaw);
        } catch (e: any) {
          console.error(`\n  ${e.message}\n`);
          process.exit(1);
        }

        let phone: string | undefined;
        let areaCode: string | undefined;
        if (phoneRaw) {
          if (hasFlag("manual") || qrPng) {
            throw new Error("--phone cannot be combined with --manual or --qr-png");
          }
          areaCode = normalizeAreaCode(areaRaw);
          phone = normalizePhone(phoneRaw, areaCode);
        }

        showLogo();
        console.log("  Snowball CLI — Login\n");

        try {
          await ensureChrome(CDP_URL, flag("chrome") ?? process.env.CHROME_PATH);
          console.log("  Opening xueqiu.com...\n");
          await openXueqiuTab(CDP_URL);

          if (phone && areaCode) {
            const cookie = await runPhoneLogin(CDP_URL, {
              phone,
              areaCode,
              timeoutMs,
              dataDir: DATA_DIR,
            });
            saveToken({ cookie, extractedAt: new Date().toISOString(), source: "chrome-sms" });
            console.log("LOGIN_OK=1");
          } else if (hasFlag("manual")) {
            const cookie = await waitForManualLogin(CDP_URL, timeoutMs);
            saveToken({ cookie, extractedAt: new Date().toISOString(), source: "chrome" });
          } else {
            try {
              const { cookie } = await qrLogin(CDP_URL, { qrPngPath: qrPng, timeoutMs });
              saveToken({ cookie, extractedAt: new Date().toISOString(), source: "chrome-qr" });
            } catch (e: any) {
              // Agents and --qr-png must not block on ENTER. A TTY can still fall back.
              if (qrPng || !process.stdin.isTTY) {
                throw new Error(`QR failed: ${e.message}`);
              }
              console.error(`\n  QR failed: ${e.message}\n  Falling back to manual...\n`);
              const cookie = await waitForManualLogin(CDP_URL, timeoutMs);
              saveToken({ cookie, extractedAt: new Date().toISOString(), source: "chrome" });
            }
          }
          console.log("\n  ✓ Login successful! Token saved.\n");
          console.log("  Try: snowball quote SH600519\n");
        } finally {
          stopStartedXvfb();
        }
      },
    },
    token: {
      usage: "token <cookie-string>",
      desc: "Set token manually (from browser DevTools)",
      run: async () => {
        const cookie = requireArg(1, 'Usage: snowball token "xq_a_token=xxx; u=xxx"');
        if (!cookie.includes("xq_a_token")) {
          console.error("\n  Cookie must include xq_a_token.\n");
          process.exit(1);
        }
        saveToken({ cookie, extractedAt: new Date().toISOString(), source: "manual" });
        console.log("\n  Token saved!\n");
      },
    },
    logout: {
      usage: "logout",
      desc: "Remove saved token",
      run: async () => {
        const { existsSync, unlinkSync } = await import("fs");
        const { TOKEN_PATH } = await import("./lib/auth");
        if (existsSync(TOKEN_PATH)) {
          unlinkSync(TOKEN_PATH);
          console.log("\n  Token removed.\n");
        } else {
          console.log("\n  Not logged in.\n");
        }
      },
    },
    export: {
      usage: "export",
      desc: "Print token as base64 (for transfer to VPS/headless server)",
      run: async () => {
        const token = loadToken();
        if (!token) {
          console.error("\n  Not logged in. Run: snowball login\n");
          process.exit(1);
        }
        const b64 = Buffer.from(JSON.stringify(token)).toString("base64");
        console.log(b64);
      },
    },
    import: {
      usage: "import <base64>",
      desc: "Import token from base64 (from snowball export)",
      run: async () => {
        const b64 = requireArg(1, "Usage: snowball import <base64-string>\n  Get it from: snowball export");
        try {
          const token = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
          if (!token.cookie?.includes("xq_a_token")) {
            console.error("\n  Invalid token: missing xq_a_token\n");
            process.exit(1);
          }
          saveToken(token);
          console.log("\n  Token imported!\n");
        } catch {
          console.error("\n  Invalid base64 string.\n");
          process.exit(1);
        }
      },
    },
    status: {
      usage: "status",
      desc: "Check login status and verify token",
      run: async () => {
        const token = loadToken();
        if (!token) {
          console.log("\n  Not logged in. Run: snowball login\n");
          return;
        }
        const days = Math.floor((Date.now() - new Date(token.extractedAt).getTime()) / 86400000);
        process.stdout.write(`\n  Token: ${token.source}, saved ${days === 0 ? "today" : days + "d ago"}`);
        process.stdout.write(" — verifying...");
        const { valid } = await verifyToken(token.cookie);
        console.log(valid ? " ✓ active\n" : " ✗ expired\n  Run: snowball login\n");
      },
    },
  },

  // ── Market ────────────────────────────────────────────────────
  "Market": {
    quote: {
      usage: "quote <symbol> [symbol...] [--detail]",
      desc: "Real-time quote (no login needed)",
      run: async () => {
        const sym = requireArg(1, "Usage: snowball quote SH600519 [SZ000858...]");
        const all = [sym, ...symbols()];
        out(hasFlag("detail") ? await api.quoteDetail(all[0]) : await api.quote(all));
      },
    },
    pankou: {
      usage: "pankou <symbol>",
      desc: "Order book / bid-ask levels",
      run: async () => out(await api.pankou(requireArg(1, "Usage: snowball pankou SH600519"))),
    },
    kline: {
      usage: "kline <symbol> [--period day] [--count 120]",
      desc: "K-line / candlestick data",
      run: async () => {
        const sym = requireArg(1, "Usage: snowball kline SH600519 [--period week --count 52]");
        out(await api.kline(sym, (flag("period") ?? "day") as any, count(120)));
      },
    },
    minute: {
      usage: "minute <symbol>",
      desc: "Minute-level chart data",
      run: async () => out(await api.minute(requireArg(1, "Usage: snowball minute SH600519"))),
    },
    market: {
      usage: "market",
      desc: "Major indices overview (no login needed)",
      run: async () => out(await api.indices()),
    },
  },

  // ── Financials ────────────────────────────────────────────────
  "Financials": {
    income: {
      usage: "income <symbol> [--count 5]",
      desc: "Income statement",
      run: async () => out(await api.income(requireArg(1, "Usage: snowball income SH600519"), "all", count(5))),
    },
    balance: {
      usage: "balance <symbol> [--count 5]",
      desc: "Balance sheet",
      run: async () => out(await api.balance(requireArg(1, "Usage: snowball balance SH600519"), "all", count(5))),
    },
    cashflow: {
      usage: "cashflow <symbol> [--count 5]",
      desc: "Cash flow statement",
      run: async () => out(await api.cashflow(requireArg(1, "Usage: snowball cashflow SH600519"), "all", count(5))),
    },
    indicator: {
      usage: "indicator <symbol> [--count 5]",
      desc: "Key financial indicators",
      run: async () => out(await api.indicator(requireArg(1, "Usage: snowball indicator SH600519"), "all", count(5))),
    },
    business: {
      usage: "business <symbol>",
      desc: "Revenue breakdown by segment",
      run: async () => out(await api.business(requireArg(1, "Usage: snowball business SH600519"))),
    },
    forecast: {
      usage: "forecast <symbol>",
      desc: "Earnings forecast",
      run: async () => out(await api.forecast(requireArg(1, "Usage: snowball forecast SH600519"))),
    },
  },

  // ── Company (F10) ─────────────────────────────────────────────
  "Company": {
    company: {
      usage: "company <symbol>",
      desc: "Company profile",
      run: async () => out(await api.company(requireArg(1, "Usage: snowball company SH600519"))),
    },
    holders: {
      usage: "holders <symbol> [--top]",
      desc: "Shareholder count history (--top for top 10)",
      run: async () => {
        const sym = requireArg(1, "Usage: snowball holders SH600519 [--top]");
        out(hasFlag("top") ? await api.topHolders(sym) : await api.holders(sym));
      },
    },
    bonus: {
      usage: "bonus <symbol>",
      desc: "Dividend & bonus history",
      run: async () => out(await api.bonus(requireArg(1, "Usage: snowball bonus SH600519"))),
    },
    industry: {
      usage: "industry <symbol>",
      desc: "Industry & concept classification",
      run: async () => out(await api.industry(requireArg(1, "Usage: snowball industry SH600519"))),
    },
    org: {
      usage: "org <symbol>",
      desc: "Institutional holding changes",
      run: async () => out(await api.orgHolding(requireArg(1, "Usage: snowball org SH600519"))),
    },
  },

  // ── Capital Flow ──────────────────────────────────────────────
  "Capital": {
    flow: {
      usage: "flow <symbol> [--history]",
      desc: "Capital flow (intraday or --history for daily)",
      run: async () => {
        const sym = requireArg(1, "Usage: snowball flow SH600519 [--history]");
        out(hasFlag("history") ? await api.capitalHistory(sym) : await api.capitalFlow(sym));
      },
    },
    assort: {
      usage: "assort <symbol>",
      desc: "Capital by order size (large/medium/small)",
      run: async () => out(await api.capitalAssort(requireArg(1, "Usage: snowball assort SH600519"))),
    },
    margin: {
      usage: "margin <symbol> [--count 20]",
      desc: "Margin trading data",
      run: async () => out(await api.margin(requireArg(1, "Usage: snowball margin SH600519"))),
    },
    block: {
      usage: "block <symbol> [--count 20]",
      desc: "Block (large) transactions",
      run: async () => out(await api.blockTrans(requireArg(1, "Usage: snowball block SH600519"))),
    },
  },

  // ── Social & News ─────────────────────────────────────────────
  "Social": {
    trending: {
      usage: "trending [day|week|month] [--count 10]",
      desc: "Hot posts / KOL articles",
      run: async () => out(await api.hotPosts((arg(1) ?? "day") as any, count(10))),
    },
    live: {
      usage: "live [--count 20] [--important]",
      desc: "7x24 live news feed",
      run: async () => out(hasFlag("important") ? await api.liveNewsImportant(count(20)) : await api.liveNews(count(20))),
    },
    feed: {
      usage: "feed [category] [--count 20]",
      desc: "Feed: headlines|today|a-shares|us|hk|funds|private",
      run: async () => out(await api.feed(arg(1) ?? "headlines", count(20))),
    },
    hot: {
      usage: "hot [cn|us|hk|global]",
      desc: "Hot stocks by market",
      run: async () => out(await api.hotStocks((arg(1) ?? "cn") as any)),
    },
    kol: {
      usage: "kol <symbol> [--count 10]",
      desc: "KOLs / influencers for a stock",
      run: async () => out(await api.stockKOLs(requireArg(1, "Usage: snowball kol SH600519"), count(10))),
    },
    user: {
      usage: "user <user_id> [--count 10]",
      desc: "A user's recent posts",
      run: async () => out(await api.userPosts(requireArg(1, "Usage: snowball user <user_id>"), count(10))),
    },
    profile: {
      usage: "profile <user_id>",
      desc: "User profile (bio, followers, verified)",
      run: async () => out(await api.userProfile(requireArg(1, "Usage: snowball profile <user_id>"))),
    },
    post: {
      usage: "post <post_id>",
      desc: "Single post detail by ID",
      run: async () => out(await api.postDetail(requireArg(1, "Usage: snowball post <post_id>"))),
    },
  },

  // ── Discovery ─────────────────────────────────────────────────
  "Discovery": {
    search: {
      usage: "search <keyword>",
      desc: "Search stocks by keyword",
      run: async () => out(await api.search(requireArg(1, "Usage: snowball search 茅台"))),
    },
    "search-user": {
      usage: "search-user <keyword> [--count 10]",
      desc: "Search users by keyword",
      run: async () => out(await api.searchUsers(requireArg(1, "Usage: snowball search-user 价投"), count(10))),
    },
    screen: {
      usage: "screen [SH|HK|US] [--count 30]",
      desc: "Stock screener",
      run: async () => out(await api.screen((arg(1) ?? "SH") as any, "symbol", 1, count(30))),
    },
  },

  // ── Funds ─────────────────────────────────────────────────────
  "Funds": {
    fund: {
      usage: "fund <code> [--nav] [--growth]",
      desc: "Fund detail, NAV history, or growth",
      run: async () => {
        const code = requireArg(1, "Usage: snowball fund 110011 [--nav] [--growth]");
        out(hasFlag("nav") ? await api.fundNav(code) : hasFlag("growth") ? await api.fundGrowth(code) : await api.fund(code));
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════
//  Dispatch
// ═══════════════════════════════════════════════════════════════

// Version
if (MODE === "--version" || MODE === "-v") {
  console.log(VERSION);
  process.exit(0);
}

// Find and run command
for (const group of Object.values(commands)) {
  if (MODE && MODE in group) {
    try {
      await group[MODE].run();
    } catch (e: any) {
      console.error(`\n  Error: ${e.message}\n`);
      process.exit(1);
    }
    process.exit(0);
  }
}

// ═══════════════════════════════════════════════════════════════
//  Help (fallback)
// ═══════════════════════════════════════════════════════════════

showLogo();
console.log(`  Snowball CLI v${VERSION} — Xueqiu stock data for AI agents\n`);

for (const [groupName, cmds] of Object.entries(commands)) {
  console.log(`  ${groupName}:`);
  for (const [, cmd] of Object.entries(cmds)) {
    const usage = `snowball ${cmd.usage}`;
    const pad = Math.max(2, 40 - usage.length);
    console.log(`    ${usage}${" ".repeat(pad)}${cmd.desc}`);
  }
  console.log();
}

console.log(`  Symbols:`);
console.log(`    SH600519  Shanghai (Maotai)      AAPL   US stock`);
console.log(`    SZ000858  Shenzhen (Wuliangye)   01810  HK stock (Xiaomi)\n`);
console.log(`  All output is JSON — pipe to jq or use in agent scripts.\n`);
