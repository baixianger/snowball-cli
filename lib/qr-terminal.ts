/**
 * QR Login via Xueqiu API + terminal / PNG display
 *
 * Flow:
 *   1. Extract WAF cookies (device_id, xq_a_token, ...) from Chrome via CDP
 *   2. POST https://www.xueqiu.com/snb/provider/generate-qr-code → QR URL
 *   3. Encode that URL as a terminal QR and/or a PNG file
 *   4. GET  https://www.xueqiu.com/snb/provider/query-qr-code-state?code=X
 *   5. Return auth cookies once the app confirms
 *
 * The poll must hit www.xueqiu.com directly. GET on the apex host returns
 * 301 to www, and fetch() drops the Cookie header when it follows that
 * redirect — the cookieless follow-up is HTTP 400 {}. POST generate is not
 * redirected, which is why the QR appeared and the first poll failed.
 *
 * Status codes match the current xueqiu web bundle (main.js):
 *   0 waiting, 1 scanned, 2 confirmed (or bind-phone), 3 cancelled,
 *   4 expired, 5 login.
 */

import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import QRCode from "qrcode";

/** Host the logged-in web app and the QR state API actually live on. */
export const XUEQIU_ORIGIN = "https://www.xueqiu.com";

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json",
  Origin: XUEQIU_ORIGIN,
  Referer: `${XUEQIU_ORIGIN}/`,
  "X-Requested-With": "XMLHttpRequest",
};

export function qrGenerateUrl(): string {
  return `${XUEQIU_ORIGIN}/snb/provider/generate-qr-code`;
}

export function qrPollUrl(code: string): string {
  return `${XUEQIU_ORIGIN}/snb/provider/query-qr-code-state?code=${encodeURIComponent(code)}`;
}

export type QRDecision =
  | { type: "pending" }
  | { type: "scanned" }
  | { type: "confirmed"; payload: any }
  | { type: "bindphone"; payload: any }
  | { type: "cancelled" }
  | { type: "expired" }
  | { type: "login"; payload: any }
  | { type: "invalid"; status: unknown };

/** Map a query-qr-code-state JSON body to the next login step. */
export function interpretQRState(body: any): QRDecision {
  const status = body?.data?.status;
  switch (status) {
    case 0:
      return { type: "pending" };
    case 1:
      return { type: "scanned" };
    case 2:
      return body?.data?.is_bind_tel
        ? { type: "confirmed", payload: body.data }
        : { type: "bindphone", payload: body.data };
    case 3:
      return { type: "cancelled" };
    case 4:
      return { type: "expired" };
    case 5:
      return { type: "login", payload: body.data };
    default:
      return { type: "invalid", status };
  }
}

export function parseCookie(cookie: string): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of cookie.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    cookies.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1));
  }
  return cookies;
}

/** Merge two cookie strings. Later values override earlier ones. */
export function mergeCookies(base: string, override: string): string {
  const cookies = parseCookie(base);
  for (const [key, value] of parseCookie(override)) cookies.set(key, value);
  return [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

/**
 * A guest session already has xq_a_token. Real login sets xq_is_login
 * (the web app treats that cookie, plus `u`, as the logged-in flag).
 */
export function hasLoginCookie(cookie: string): boolean {
  const cookies = parseCookie(cookie);
  const flag = cookies.get("xq_is_login");
  return Boolean(flag && flag !== "0" && cookies.get("xq_a_token") && cookies.get("u"));
}

export function readSetCookie(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

export function cookiePairsFromSetCookie(setCookies: string[]): string {
  return setCookies
    .map((line) => line.split(";")[0]?.trim())
    .filter((pair): pair is string => Boolean(pair && pair.includes("=")))
    .join("; ");
}

/**
 * fetch() will not replay a manually set Cookie header across redirects.
 * Xueqiu 301s the apex host to www and the follow-up is an anonymous 400,
 * so redirects are replayed here with the cookie jar intact.
 */
export async function fetchXueqiu(
  url: string,
  cookie: string,
  init: RequestInit = {},
  redirects = 0,
): Promise<{ response: Response; cookie: string }> {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  if (cookie) headers.set("Cookie", cookie);

  const response = await fetch(url, { ...init, headers, redirect: "manual" });
  const extra = cookiePairsFromSetCookie(readSetCookie(response));
  const nextCookie = extra ? mergeCookies(cookie, extra) : cookie;

  if (response.status >= 300 && response.status < 400 && redirects < 5) {
    const location = response.headers.get("location");
    if (location) {
      await response.arrayBuffer().catch(() => {});
      return fetchXueqiu(new URL(location, url).toString(), nextCookie, init, redirects + 1);
    }
  }

  return { response, cookie: nextCookie };
}

// ═══════════════════════════════════════════════════════════════
//  Step 1: Extract WAF cookies from Chrome
// ═══════════════════════════════════════════════════════════════

function cookiesFromTarget(webSocketDebuggerUrl: string): Promise<string> {
  const ws = new WebSocket(webSocketDebuggerUrl);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("CDP timeout"));
    }, 10000);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: "Network.enable" }));
      ws.send(JSON.stringify({
        id: 2,
        method: "Network.getCookies",
        params: { urls: [XUEQIU_ORIGIN, "https://xueqiu.com"] },
      }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(typeof event.data === "string" ? event.data : "");
      if (msg.id === 2) {
        clearTimeout(timeout);
        ws.close();
        const cookies = msg.result?.cookies || [];
        const cookieStr = cookies
          .filter((cookie: any) => cookie.domain?.includes("xueqiu"))
          .map((cookie: any) => `${cookie.name}=${cookie.value}`)
          .join("; ");

        if (!cookieStr.includes("device_id")) {
          reject(new Error("No device_id cookie — page may not have loaded yet"));
          return;
        }
        resolve(cookieStr);
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("CDP connection failed"));
    };
  });
}

/** Get xueqiu cookies from Chrome via CDP (device_id, cookiesu, u, etc.) */
export async function getWafCookies(cdpUrl: string): Promise<string> {
  const targetsRes = await fetch(`${cdpUrl}/json`);
  const targets: any[] = await targetsRes.json();
  const pages = targets.filter(
    (target: any) => target.type === "page" && target.url?.includes("xueqiu.com") && target.webSocketDebuggerUrl,
  );

  if (pages.length === 0) {
    throw new Error("No xueqiu.com tab found in Chrome");
  }

  let lastError = "No device_id cookie — page may not have loaded yet";
  for (const page of pages) {
    try {
      return await cookiesFromTarget(page.webSocketDebuggerUrl);
    } catch (error: any) {
      lastError = error?.message ?? lastError;
    }
  }
  throw new Error(lastError);
}

// ═══════════════════════════════════════════════════════════════
//  Step 2: Generate QR code via API
// ═══════════════════════════════════════════════════════════════

interface QRGenerateResult {
  qrUrl: string;
  code: string;
  cookie: string;
}

/** Call xueqiu API to generate a QR login code */
export async function generateQRCode(wafCookies: string): Promise<QRGenerateResult> {
  const { response, cookie } = await fetchXueqiu(qrGenerateUrl(), wafCookies, { method: "POST" });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 180);
    throw new Error(`QR generate failed: HTTP ${response.status} ${detail}`);
  }

  const data = await response.json();
  if (!data.success || !data.data?.qr_code) {
    throw new Error(`QR generate failed: ${data.message || JSON.stringify(data)}`);
  }

  const qrUrl = data.data.qr_code;
  const codeMatch = qrUrl.match(/code=([a-f0-9]+)/i);
  if (!codeMatch) {
    throw new Error(`Could not parse QR code from URL: ${qrUrl}`);
  }

  return { qrUrl, code: codeMatch[1], cookie };
}

// ═══════════════════════════════════════════════════════════════
//  Step 3: Render QR
// ═══════════════════════════════════════════════════════════════

/** Render a URL as a QR code in the terminal using unicode blocks */
export async function renderQRToTerminal(url: string): Promise<void> {
  const qrText = await QRCode.toString(url, {
    type: "terminal",
    small: true,
    margin: 1,
  });
  console.log(qrText);
}

/** Write a PNG QR and return the absolute path. */
export async function writeQRPng(url: string, filePath: string): Promise<string> {
  const absolute = resolve(filePath);
  mkdirSync(dirname(absolute), { recursive: true });
  await QRCode.toFile(absolute, url, {
    type: "png",
    margin: 1,
    width: 360,
    errorCorrectionLevel: "M",
  });
  return absolute;
}

// ═══════════════════════════════════════════════════════════════
//  Step 4: Poll for scan completion
// ═══════════════════════════════════════════════════════════════

async function cookiesFromConfirm(cookie: string, payload: any, cdpUrl: string): Promise<string> {
  if (hasLoginCookie(cookie)) return cookie;

  if (payload?.access_token) {
    const synthesized = mergeCookies(
      cookie,
      [
        `xq_a_token=${payload.access_token}`,
        payload.refresh_token ? `xq_r_token=${payload.refresh_token}` : "",
        payload.id_token ? `xq_id_token=${payload.id_token}` : "",
        payload.uid || payload.user_id ? `u=${payload.uid || payload.user_id}` : "",
        "xq_is_login=1",
      ].filter(Boolean).join("; "),
    );
    if (hasLoginCookie(synthesized)) return synthesized;
  }

  console.log("\n  Scan confirmed. Reading auth cookies from Chrome...");
  await new Promise((r) => setTimeout(r, 1500));
  try {
    const fromChrome = await getWafCookies(cdpUrl);
    if (hasLoginCookie(fromChrome)) return fromChrome;
  } catch {
    // Chrome may not have received Set-Cookie when we polled outside the page.
  }

  throw new Error(
    "Login was confirmed but xq_is_login was not in the response cookies. " +
      "Try again, or paste a cookie with: snowball token \"xq_a_token=...; u=...\"",
  );
}

/**
 * Poll QR scan status until the user confirms login.
 * Returns the full cookie string including xq_is_login on success,
 * or the sentinel "EXPIRED" when the code should be regenerated.
 */
export async function pollQRStatus(
  code: string,
  wafCookies: string,
  cdpUrl: string,
  timeoutMs = 120000,
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 2500;
  let cookie = wafCookies;
  let announcedScan = false;

  while (Date.now() - startTime < timeoutMs) {
    const result = await fetchXueqiu(qrPollUrl(code), cookie);
    cookie = result.cookie;
    const res = result.response;

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 180);
      throw new Error(`Poll failed: HTTP ${res.status} ${detail}`);
    }

    const data = await res.json();
    const decision = interpretQRState(data);

    if (decision.type === "confirmed" || decision.type === "login") {
      return cookiesFromConfirm(cookie, decision.payload, cdpUrl);
    }

    if (decision.type === "bindphone") {
      throw new Error(
        "Xueqiu asked this account to bind a phone number before QR login can finish. " +
          "Bind it in the Xueqiu app, then run snowball login again.",
      );
    }

    if (decision.type === "cancelled") {
      throw new Error("Login cancelled in the Xueqiu app.");
    }

    if (decision.type === "expired") return "EXPIRED";

    if (decision.type === "invalid") {
      throw new Error(`Unexpected QR status: ${JSON.stringify(data).slice(0, 180)}`);
    }

    if (decision.type === "scanned" && !announcedScan) {
      announcedScan = true;
      process.stdout.write("\n  Scanned. Tap 确认登录 in the Xueqiu app.\n  ");
    } else {
      process.stdout.write(decision.type === "scanned" ? "✓" : ".");
    }

    await new Promise((r) => setTimeout(r, pollInterval));
  }

  throw new Error("Login timeout (2 min). QR code may have expired.");
}

// ═══════════════════════════════════════════════════════════════
//  Combined: full QR login flow
// ═══════════════════════════════════════════════════════════════

export interface QRLoginResult {
  cookie: string;
  code: string;
}

export interface QRLoginOptions {
  /** Write the QR image here and print the absolute path. */
  qrPngPath?: string;
  /**
   * Draw the unicode QR on stdout. Defaults to true when stdout is a TTY.
   * Ignored when stdout is not a TTY (the PNG or the raw URL is printed instead).
   */
  drawTerminal?: boolean;
}

async function presentQR(qrUrl: string, options: QRLoginOptions): Promise<void> {
  if (options.qrPngPath) {
    const absolute = await writeQRPng(qrUrl, options.qrPngPath);
    console.log(`  QR_PNG=${absolute}`);
  }

  const draw = options.drawTerminal !== false && Boolean(process.stdout.isTTY);
  if (draw) {
    await renderQRToTerminal(qrUrl);
  } else if (!options.qrPngPath) {
    console.log(`  QR_URL=${qrUrl}`);
  }
}

/**
 * Full QR login: get WAF cookies → generate QR → display → poll → return auth cookies.
 * Chrome must be running with xueqiu.com loaded (for WAF cookies).
 */
export async function qrLogin(cdpUrl: string, options: QRLoginOptions = {}): Promise<QRLoginResult> {
  console.log("  Waiting for WAF cookies");
  process.stdout.write("  ");
  let wafCookies = "";
  let lastError = "";
  for (let i = 0; i < 15; i++) {
    try {
      wafCookies = await getWafCookies(cdpUrl);
      break;
    } catch (error: any) {
      lastError = error?.message ?? String(error);
      process.stdout.write(".");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (!wafCookies) {
    throw new Error(
      `Could not get WAF cookies after 30s (${lastError || "no device_id"}). ` +
        "Xueqiu blocks headless Chrome. Start a real Chrome window " +
        "(on a server: install Xvfb, or import a token from a machine with a display).",
    );
  }
  console.log("\n  ✓ Got WAF cookies\n");

  const MAX_QR_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_QR_ATTEMPTS; attempt++) {
    console.log("  Generating QR code...");
    const generated = await generateQRCode(wafCookies);
    wafCookies = generated.cookie;
    console.log("  ✓ QR code ready\n");

    if (options.qrPngPath) {
      console.log("  Scan this image with the Xueqiu app, then tap 确认登录.");
      console.log("  This command waits until that finishes. No need to press ENTER.\n");
    } else if (process.stdout.isTTY) {
      console.log("  ┌────────────────────────────────────┐");
      console.log("  │  Scan this QR with the Xueqiu app  │");
      console.log("  └────────────────────────────────────┘\n");
    }
    await presentQR(generated.qrUrl, options);

    console.log("  Waiting for scan");
    process.stdout.write("  ");
    const cookie = await pollQRStatus(generated.code, wafCookies, cdpUrl);

    if (cookie === "EXPIRED") {
      if (attempt < MAX_QR_ATTEMPTS) {
        console.log(`\n  QR expired. Generating a new one... (${attempt}/${MAX_QR_ATTEMPTS})\n`);
        continue;
      }
      throw new Error("QR code expired 3 times. Run snowball login again.");
    }

    return { cookie, code: generated.code };
  }

  throw new Error("QR login failed after retries");
}
