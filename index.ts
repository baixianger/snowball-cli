/**
 * Snowball CLI — Xueqiu stock data for AI agents
 *
 * Commands:
 *   snowball login                — login via Chrome QR code
 *   snowball token <cookie>       — set token manually
 *   snowball quote <symbol>       — real-time quote
 *   snowball kline <symbol>       — K-line data
 *   snowball search <keyword>     — search stocks
 */

import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { platform } from "os";
import {
  extractFromChrome,
  saveToken,
  loadToken,
  hasToken,
  getCookie,
} from "./lib/auth";
import { qrLogin } from "./lib/qr-terminal";
import * as api from "./lib/api";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CDP_URL = Bun.argv.find((_, i, a) => a[i - 1] === "--cdp") ?? "http://127.0.0.1:9222";
const MODE = Bun.argv[2];
const VERSION = "0.1.0";

function showLogo() {
  try {
    const logo = readFileSync(join(__dirname, "lib", "logo.ansi"), "utf-8");
    console.log(logo);
  } catch {}
}

function out(data: any) {
  console.log(JSON.stringify(data, null, 2));
}

function parseArg(flag: string): string | undefined {
  const i = Bun.argv.indexOf(flag);
  return i !== -1 && i + 1 < Bun.argv.length ? Bun.argv[i + 1] : undefined;
}

// ═══════════════════════════════════════════════════════════════
//  LOGIN — shared Chrome launch logic
// ═══════════════════════════════════════════════════════════════

async function ensureChrome(cdpUrl: string): Promise<void> {
  const { spawn } = await import("child_process");
  const { mkdirSync } = await import("fs");
  const profileDir = join(homedir(), ".snowball-cli", "chrome-profile");
  mkdirSync(profileDir, { recursive: true });

  let chromeReady = false;
  try {
    await fetch(`${cdpUrl}/json/version`);
    chromeReady = true;
  } catch {}

  if (!chromeReady) {
    console.log("  Starting Chrome...");
    const bins: Record<string, string> = {
      darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      win32: "chrome.exe",
      linux: "google-chrome",
    };
    const bin = bins[platform()] ?? bins.linux;
    const child = spawn(bin, [
      "--remote-debugging-port=9222",
      `--user-data-dir=${profileDir}`,
    ], { stdio: "ignore", detached: true });
    child.unref();

    for (let i = 0; i < 15; i++) {
      await Bun.sleep(1000);
      try {
        await fetch(`${cdpUrl}/json/version`);
        chromeReady = true;
        break;
      } catch {}
    }

    if (!chromeReady) {
      console.error("  Chrome failed to start. Please launch manually.\n");
      process.exit(1);
    }
  }
}

async function openXueqiuTab(cdpUrl: string): Promise<void> {
  const versionRes = await fetch(`${cdpUrl}/json/version`);
  const { webSocketDebuggerUrl } = await versionRes.json();
  const ws = new WebSocket(webSocketDebuggerUrl);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { ws.close(); reject(new Error("timeout")); }, 10000);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: "Target.createTarget",
        params: { url: "https://xueqiu.com" },
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(typeof e.data === "string" ? e.data : "");
      if (msg.id === 1) { clearTimeout(timeout); ws.close(); resolve(); }
    };
    ws.onerror = () => { clearTimeout(timeout); reject(new Error("CDP failed")); };
  });
}

function loginSuccess(cookie: string, source: "chrome" | "chrome-qr") {
  saveToken({ cookie, extractedAt: new Date().toISOString(), source });
  console.log("\n  ✓ Login successful! Token saved.\n");
  console.log("  Try it out:");
  console.log("    snowball quote SH600519");
  console.log("    snowball market\n");
}

// ═══════════════════════════════════════════════════════════════
//  LOGIN (QR in terminal — default)
//  LOGIN --manual (old: go to Chrome window)
// ═══════════════════════════════════════════════════════════════
if (MODE === "login") {
  showLogo();
  console.log("  Snowball CLI — Login\n");

  await ensureChrome(CDP_URL);

  const isManual = Bun.argv.includes("--manual");

  if (isManual) {
    // ── Old flow: user interacts in Chrome window ──
    console.log("  Opening xueqiu.com...\n");
    await openXueqiuTab(CDP_URL);

    console.log("  Please login in the Chrome window:");
    console.log("    1. Click '登录' (Login) button");
    console.log("    2. Scan QR code with Xueqiu app");
    console.log("    3. Come back here and press ENTER\n");
    process.stdout.write("  Press ENTER after you have logged in > ");
    for await (const _ of console) break;

    try {
      const cookie = await extractFromChrome(CDP_URL);
      loginSuccess(cookie, "chrome");
    } catch (e: any) {
      console.error(`\n  Failed: ${e.message}\n`);
      process.exit(1);
    }
  } else {
    // ── New flow: QR code displayed in terminal via API ──
    console.log("  Opening xueqiu.com (background)...");
    await openXueqiuTab(CDP_URL);

    try {
      const { cookie } = await qrLogin(CDP_URL);
      loginSuccess(cookie, "chrome-qr");
    } catch (e: any) {
      console.error(`\n  QR login failed: ${e.message}`);
      console.error("  Falling back to manual mode...\n");

      console.log("  Please login in the Chrome window:");
      console.log("    1. Click '登录' (Login) button");
      console.log("    2. Scan QR code with Xueqiu app");
      console.log("    3. Come back here and press ENTER\n");
      process.stdout.write("  Press ENTER after you have logged in > ");
      for await (const _ of console) break;

      try {
        const cookie = await extractFromChrome(CDP_URL);
        loginSuccess(cookie, "chrome");
      } catch (e2: any) {
        console.error(`\n  Failed: ${e2.message}\n`);
        process.exit(1);
      }
    }
  }

  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  TOKEN (manual set)
// ═══════════════════════════════════════════════════════════════
if (MODE === "token") {
  const cookie = Bun.argv[3];
  if (!cookie) {
    console.error("\n  Usage: snowball token <cookie-string>\n");
    console.error("  Get from Chrome DevTools → Application → Cookies → xueqiu.com");
    console.error("  Copy xq_a_token and u values:\n");
    console.error('    snowball token "xq_a_token=xxx; u=xxx"\n');
    process.exit(1);
  }

  if (!cookie.includes("xq_a_token")) {
    console.error("\n  Cookie must include xq_a_token. Got:", cookie.slice(0, 50), "\n");
    process.exit(1);
  }

  saveToken({ cookie, extractedAt: new Date().toISOString(), source: "manual" });
  console.log("\n  Token saved!\n");
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  STATUS
// ═══════════════════════════════════════════════════════════════
if (MODE === "status") {
  const token = loadToken();
  if (!token) {
    console.log("\n  Not logged in. Run: snowball login\n");
  } else {
    console.log(`\n  Logged in (${token.source}, ${token.extractedAt})\n`);
  }
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  QUOTE
// ═══════════════════════════════════════════════════════════════
if (MODE === "quote") {
  const symbols = Bun.argv.slice(3).filter(a => !a.startsWith("-"));
  if (symbols.length === 0) {
    console.error("\n  Usage: snowball quote <symbol> [symbol...]\n");
    console.error("  Examples:");
    console.error("    snowball quote SH600519        # Maotai");
    console.error("    snowball quote SZ000858        # Wuliangye");
    console.error("    snowball quote AAPL MSFT       # US stocks\n");
    process.exit(1);
  }

  if (Bun.argv.includes("--detail")) {
    out(await api.quoteDetail(symbols[0]));
  } else {
    out(await api.quote(symbols));
  }
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  KLINE
// ═══════════════════════════════════════════════════════════════
if (MODE === "kline") {
  const symbol = Bun.argv[3];
  if (!symbol || symbol.startsWith("-")) {
    console.error("\n  Usage: snowball kline <symbol> [--period day] [--count 120]\n");
    process.exit(1);
  }

  const period = (parseArg("--period") ?? "day") as any;
  const count = parseInt(parseArg("--count") ?? "120");
  out(await api.kline(symbol, period, count));
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════════
if (MODE === "search") {
  const query = Bun.argv[3];
  if (!query) {
    console.error("\n  Usage: snowball search <keyword>\n");
    process.exit(1);
  }

  out(await api.search(query));
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  FINANCIALS
// ═══════════════════════════════════════════════════════════════
if (MODE === "income" || MODE === "balance" || MODE === "cashflow" || MODE === "indicator") {
  const symbol = Bun.argv[3];
  if (!symbol || symbol.startsWith("-")) {
    console.error(`\n  Usage: snowball ${MODE} <symbol> [--count 5]\n`);
    process.exit(1);
  }

  const count = parseInt(parseArg("--count") ?? "5");
  const fn = { income: api.income, balance: api.balance, cashflow: api.cashflow, indicator: api.indicator }[MODE]!;
  out(await fn(symbol, "all", count));
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  CAPITAL FLOW
// ═══════════════════════════════════════════════════════════════
if (MODE === "flow") {
  const symbol = Bun.argv[3];
  if (!symbol) {
    console.error("\n  Usage: snowball flow <symbol>\n");
    process.exit(1);
  }

  if (Bun.argv.includes("--history")) {
    out(await api.capitalHistory(symbol));
  } else {
    out(await api.capitalFlow(symbol));
  }
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  MARKET INDICES
// ═══════════════════════════════════════════════════════════════
if (MODE === "market") {
  out(await api.indices());
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  PANKOU (order book)
// ═══════════════════════════════════════════════════════════════
if (MODE === "pankou") {
  const symbol = Bun.argv[3];
  if (!symbol) {
    console.error("\n  Usage: snowball pankou <symbol>\n");
    process.exit(1);
  }

  out(await api.pankou(symbol));
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  FORECAST
// ═══════════════════════════════════════════════════════════════
if (MODE === "forecast") {
  const symbol = Bun.argv[3];
  if (!symbol) {
    console.error("\n  Usage: snowball forecast <symbol>\n");
    process.exit(1);
  }

  out(await api.forecast(symbol));
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  COMPANY (F10)
// ═══════════════════════════════════════════════════════════════
if (MODE === "company") {
  const symbol = Bun.argv[3];
  if (!symbol) {
    console.error("\n  Usage: snowball company <symbol>\n");
    process.exit(1);
  }
  out(await api.company(symbol));
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  HOLDERS
// ═══════════════════════════════════════════════════════════════
if (MODE === "holders") {
  const symbol = Bun.argv[3];
  if (!symbol) {
    console.error("\n  Usage: snowball holders <symbol> [--top]\n");
    process.exit(1);
  }
  if (Bun.argv.includes("--top")) {
    out(await api.topHolders(symbol));
  } else {
    out(await api.holders(symbol));
  }
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  HOT STOCKS
// ═══════════════════════════════════════════════════════════════
if (MODE === "hot") {
  const market = (Bun.argv[3] ?? "cn") as "global" | "us" | "cn" | "hk";
  out(await api.hotStocks(market));
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  NEWS FEED
// ═══════════════════════════════════════════════════════════════
if (MODE === "feed") {
  const category = (Bun.argv[3] ?? "headlines") as any;
  const count = parseInt(parseArg("--count") ?? "20");
  out(await api.feed(category, count));
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  FUND
// ═══════════════════════════════════════════════════════════════
if (MODE === "fund") {
  const code = Bun.argv[3];
  if (!code) {
    console.error("\n  Usage: snowball fund <code> [--nav] [--growth]\n");
    process.exit(1);
  }
  if (Bun.argv.includes("--nav")) {
    out(await api.fundNav(code));
  } else if (Bun.argv.includes("--growth")) {
    out(await api.fundGrowth(code));
  } else {
    out(await api.fund(code));
  }
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  VERSION
// ═══════════════════════════════════════════════════════════════
if (MODE === "--version" || MODE === "-v") {
  console.log(VERSION);
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  HELP
// ═══════════════════════════════════════════════════════════════
showLogo();
console.log(`
  Snowball CLI v${VERSION} — Xueqiu stock data for AI agents

  Auth:
    snowball login                     Login — shows QR code in terminal
    snowball login --manual            Login — scan QR in Chrome window
    snowball token <cookie>            Set token manually
    snowball status                    Check login status

  Quotes:
    snowball quote <symbol>            Real-time quote (no login needed)
    snowball quote <symbol> --detail   Detailed (PE, PB, dividend, etc.)
    snowball pankou <symbol>           Order book (bid/ask)
    snowball market                    Major indices overview

  Charts:
    snowball kline <symbol>            K-line / candlestick data
    snowball kline <sym> --period week --count 52

  Financials:
    snowball income <symbol>           Income statement
    snowball balance <symbol>          Balance sheet
    snowball cashflow <symbol>         Cash flow
    snowball indicator <symbol>        Key indicators
    snowball forecast <symbol>         Earnings forecast

  Company (F10):
    snowball company <symbol>          Company profile
    snowball holders <symbol>          Shareholder count history
    snowball holders <symbol> --top    Top 10 shareholders

  Capital:
    snowball flow <symbol>             Intraday capital flow
    snowball flow <symbol> --history   Historical daily flow

  Social:
    snowball hot [cn|us|hk|global]     Hot stocks
    snowball feed [headlines|a-shares|us|hk|funds]

  Discovery:
    snowball search <keyword>          Search stocks

  Funds:
    snowball fund <code>               Fund detail
    snowball fund <code> --nav         NAV history
    snowball fund <code> --growth      Growth performance

  Symbols:
    SH600519    Shanghai (Maotai)      AAPL     US stock
    SZ000858    Shenzhen (Wuliangye)   01810    HK stock (Xiaomi)

  All output is JSON — pipe to jq or use directly in agent scripts.
`);
