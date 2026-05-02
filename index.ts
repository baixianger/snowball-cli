/**
 * Snowball CLI — Xueqiu stock data for AI agents
 * All output is JSON. Pipe to jq or use in agent scripts.
 */

import { readFileSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { platform } from "os";
import {
  extractFromChrome,
  saveToken,
  loadToken,
  getCookie,
  verifyToken,
} from "./lib/auth";
import { qrLogin } from "./lib/qr-terminal";
import * as api from "./lib/api";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CDP_URL = process.argv.find((_, i, a) => a[i - 1] === "--cdp") ?? "http://127.0.0.1:9222";
const MODE = process.argv[2];
const VERSION = "0.3.1";

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

async function ensureChrome(cdpUrl: string): Promise<void> {
  const { spawn } = await import("child_process");
  const { mkdirSync } = await import("fs");
  const profileDir = join(homedir(), ".snowball-cli", "chrome-profile");
  mkdirSync(profileDir, { recursive: true });

  let ready = false;
  try { await fetch(`${cdpUrl}/json/version`); ready = true; } catch {}

  if (!ready) {
    console.log("  Starting Chrome...");

    // Priority: --chrome flag > CHROME_PATH env > platform defaults
    const userPath = flag("chrome") ?? process.env.CHROME_PATH;
    let bin: string;

    if (userPath) {
      bin = userPath;
    } else {
      const defaults: Record<string, string[]> = {
        darwin: [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ],
        win32: [
          join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
          join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
          join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
          join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Chromium", "Application", "chrome.exe"),
          join(process.env.LOCALAPPDATA ?? "", "Chromium", "Application", "chrome.exe"),
        ],
        linux: [
          "google-chrome", "google-chrome-stable",
          "chromium-browser", "chromium",
          "/usr/bin/chromium-browser", "/usr/bin/chromium",
          "/snap/bin/chromium",
        ],
      };
      const candidates = defaults[platform()] ?? defaults.linux;
      const { existsSync } = await import("fs");
      const { execSync } = await import("child_process");
      bin = "";
      for (const c of candidates) {
        // Absolute paths: check file exists. Bare names: check if on PATH.
        if (c.includes("/") || c.includes("\\")) {
          if (existsSync(c)) { bin = c; break; }
        } else {
          try {
            const cmd = platform() === "win32" ? `where ${c}` : `which ${c}`;
            execSync(cmd, { stdio: "ignore" });
            bin = c; break;
          } catch {}
        }
      }
      if (!bin) {
        console.error("\n  Chrome / Chromium not found.\n");
        if (platform() === "linux") {
          console.error("  Install Chromium:\n");
          console.error("    apt install -y chromium-browser   # Debian/Ubuntu");
          console.error("    yum install -y chromium           # CentOS/RHEL");
          console.error("    snap install chromium              # Snap\n");
        } else if (platform() === "win32") {
          console.error("  Set CHROME_PATH:\n");
          console.error('    set CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"\n');
        } else {
          console.error("  Install Chrome or Chromium, or set CHROME_PATH:\n");
          console.error("    export CHROME_PATH=/path/to/chrome\n");
        }
        console.error("  Or use --chrome flag:  snowball login --chrome /path/to/chrome");
        console.error("  Or skip browser:       snowball import $(snowball export)  # from another machine\n");
        process.exit(1);
      }
    }

    // Headless detection: no DISPLAY on Linux = headless server
    const isHeadless = platform() === "linux" && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;
    const chromeArgs = [
      "--remote-debugging-port=9222",
      `--user-data-dir=${profileDir}`,
      ...(isHeadless ? ["--headless=new", "--no-sandbox", "--disable-gpu"] : []),
    ];
    if (isHeadless) console.log("  Headless mode detected (no DISPLAY)");

    const child = spawn(bin, chromeArgs, { stdio: "ignore", detached: true });
    child.unref();

    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try { await fetch(`${cdpUrl}/json/version`); ready = true; break; } catch {}
    }
    if (!ready) { console.error("  Chrome failed to start.\n"); process.exit(1); }
  }
}

async function openXueqiuTab(cdpUrl: string): Promise<void> {
  const { webSocketDebuggerUrl } = await (await fetch(`${cdpUrl}/json/version`)).json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => { ws.close(); reject(new Error("timeout")); }, 10000);
    ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Target.createTarget", params: { url: "https://xueqiu.com" } }));
    ws.onmessage = (e) => { const m = JSON.parse(typeof e.data === "string" ? e.data : ""); if (m.id === 1) { clearTimeout(t); ws.close(); resolve(); } };
    ws.onerror = () => { clearTimeout(t); reject(new Error("CDP failed")); };
  });
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
      usage: "login [--manual] [--chrome <path>]",
      desc: "QR code login (set CHROME_PATH or --chrome for custom Chrome)",
      run: async () => {
        showLogo();
        console.log("  Snowball CLI — Login\n");
        await ensureChrome(CDP_URL);

        if (hasFlag("manual")) {
          console.log("  Opening xueqiu.com...\n");
          await openXueqiuTab(CDP_URL);
          console.log("  Please login in the Chrome window:");
          console.log("    1. Click '登录' → 2. Scan QR → 3. Press ENTER\n");
          process.stdout.write("  Press ENTER > ");
          for await (const _ of console) break;
          const cookie = await extractFromChrome(CDP_URL);
          saveToken({ cookie, extractedAt: new Date().toISOString(), source: "chrome" });
        } else {
          console.log("  Opening xueqiu.com (background)...");
          await openXueqiuTab(CDP_URL);
          try {
            const { cookie } = await qrLogin(CDP_URL);
            saveToken({ cookie, extractedAt: new Date().toISOString(), source: "chrome-qr" });
          } catch (e: any) {
            console.error(`\n  QR failed: ${e.message}\n  Falling back to manual...\n`);
            console.log("  Login in Chrome → press ENTER\n");
            process.stdout.write("  Press ENTER > ");
            for await (const _ of console) break;
            const cookie = await extractFromChrome(CDP_URL);
            saveToken({ cookie, extractedAt: new Date().toISOString(), source: "chrome" });
          }
        }
        console.log("\n  ✓ Login successful! Token saved.\n");
        console.log("  Try: snowball quote SH600519\n");
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

  // ── Portfolio ────────────────────────────────────────────────
  "Portfolio": {
    "portfolio-list": {
      usage: "portfolio-list",
      desc: "List your portfolios (组合列表)",
      run: async () => out(await api.portfolios()),
    },
    portfolio: {
      usage: "portfolio <id> [--detail] [--performance] [--rebalance]",
      desc: "Portfolio holdings / performance / rebalance history",
      run: async () => {
        const id = requireArg(1, "Usage: snowball portfolio <id> [--detail] [--performance] [--rebalance]");
        if (hasFlag("performance")) {
          out(await api.portfolioPerformance(id, (flag("period") ?? "all") as any));
        } else if (hasFlag("rebalance")) {
          out(await api.portfolioRebalance(id));
        } else {
          out(await api.portfolioDetail(id));
        }
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
