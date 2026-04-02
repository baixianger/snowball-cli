/**
 * Auth — manage xueqiu token (cookie-based)
 *
 * Token format: "xq_a_token=xxx; u=xxx"
 * Can be obtained via:
 *   1. Chrome CDP: auto-extract from logged-in Chrome
 *   2. Manual: user pastes token from browser devtools
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const DATA_DIR = join(homedir(), ".snowball-cli");
const TOKEN_PATH = join(DATA_DIR, "token.json");
const XUEQIU_HOST = "xueqiu.com";

mkdirSync(DATA_DIR, { recursive: true });

export interface TokenData {
  cookie: string;
  extractedAt: string;
  source: "chrome" | "chrome-qr" | "manual";
}

/** Save token to disk */
export function saveToken(data: TokenData): void {
  writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2));
}

/** Load saved token */
export function loadToken(): TokenData | null {
  if (!existsSync(TOKEN_PATH)) return null;
  try {
    const raw = require(TOKEN_PATH);
    return raw as TokenData;
  } catch {
    return null;
  }
}

/** Check if token exists */
export function hasToken(): boolean {
  return existsSync(TOKEN_PATH);
}

/** Get cookie string for HTTP requests */
export function getCookie(): string {
  const token = loadToken();
  if (!token) {
    console.error("\n  Not logged in. Run:\n");
    console.error("    snowball login          # QR code in terminal");
    console.error("    snowball login --manual  # scan in Chrome window");
    console.error("    snowball token <cookie>  # manual paste\n");
    process.exit(1);
  }
  return token.cookie;
}

/** Verify token is still valid by making a lightweight API call */
export async function verifyToken(cookie: string): Promise<{ valid: boolean; username?: string }> {
  try {
    const res = await fetch("https://stock.xueqiu.com/v5/stock/realtime/quotec.json?symbol=SH000001", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Cookie": cookie,
      },
    });
    if (!res.ok) return { valid: false };
    const data = await res.json();
    // If we get data back without error, token works
    if (data.data && !data.error_code) return { valid: true };
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

/** Extract xueqiu cookies from Chrome via CDP */
export async function extractFromChrome(cdpUrl: string = "http://127.0.0.1:9222"): Promise<string> {
  // Fetch all cookies from Chrome via CDP
  const res = await fetch(`${cdpUrl}/json/version`);
  const { webSocketDebuggerUrl } = await res.json();

  const ws = new WebSocket(webSocketDebuggerUrl);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("CDP timeout"));
    }, 10000);

    ws.onopen = () => {
      // Get all cookies for xueqiu.com
      ws.send(JSON.stringify({
        id: 1,
        method: "Network.getCookies",
        params: { urls: ["https://xueqiu.com"] },
      }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(typeof event.data === "string" ? event.data : "");
      if (msg.id === 1) {
        clearTimeout(timeout);
        ws.close();

        const cookies = msg.result?.cookies || [];
        const relevant = cookies
          .filter((c: any) => c.domain?.includes("xueqiu"))
          .map((c: any) => `${c.name}=${c.value}`)
          .join("; ");

        if (!relevant.includes("xq_a_token")) {
          reject(new Error("xq_a_token not found — are you logged in to xueqiu.com in Chrome?"));
          return;
        }

        resolve(relevant);
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error(`Could not connect to Chrome at ${cdpUrl}`));
    };
  });
}

export { DATA_DIR, TOKEN_PATH, XUEQIU_HOST };
