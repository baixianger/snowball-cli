/**
 * QR Login via Xueqiu API + terminal display
 *
 * Flow:
 *   1. Extract WAF cookies (device_id, cookiesu) from Chrome via CDP
 *   2. POST /snb/provider/generate-qr-code → get QR URL
 *   3. Encode URL into QR → render in terminal
 *   4. GET /snb/provider/query-qr-code-state?code=X → poll until scanned
 *   5. Return auth cookies
 */

import QRCode from "qrcode";

const XUEQIU_URL = "https://xueqiu.com";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Origin": XUEQIU_URL,
  "Referer": `${XUEQIU_URL}/`,
  "X-Requested-With": "XMLHttpRequest",
};

// ═══════════════════════════════════════════════════════════════
//  Step 1: Extract WAF cookies from Chrome
// ═══════════════════════════════════════════════════════════════

/** Get xueqiu cookies from Chrome via CDP (device_id, cookiesu, u, etc.) */
export async function getWafCookies(cdpUrl: string): Promise<string> {
  // Must use a page-level CDP target (not browser-level) to access cookies
  const targetsRes = await fetch(`${cdpUrl}/json`);
  const targets: any[] = await targetsRes.json();
  const xueqiuPage = targets.find(
    (t: any) => t.type === "page" && t.url?.includes("xueqiu.com")
  );

  if (!xueqiuPage?.webSocketDebuggerUrl) {
    throw new Error("No xueqiu.com tab found in Chrome");
  }

  const ws = new WebSocket(xueqiuPage.webSocketDebuggerUrl);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { ws.close(); reject(new Error("CDP timeout")); }, 10000);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: "Network.enable" }));
      ws.send(JSON.stringify({
        id: 2,
        method: "Network.getCookies",
        params: { urls: [XUEQIU_URL] },
      }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(typeof event.data === "string" ? event.data : "");
      if (msg.id === 2) {
        clearTimeout(timeout);
        ws.close();
        const cookies = msg.result?.cookies || [];
        const cookieStr = cookies
          .filter((c: any) => c.domain?.includes("xueqiu"))
          .map((c: any) => `${c.name}=${c.value}`)
          .join("; ");

        if (!cookieStr.includes("device_id")) {
          reject(new Error("No device_id cookie — page may not have loaded yet"));
          return;
        }
        resolve(cookieStr);
      }
    };

    ws.onerror = () => { clearTimeout(timeout); reject(new Error("CDP connection failed")); };
  });
}

// ═══════════════════════════════════════════════════════════════
//  Step 2: Generate QR code via API
// ═══════════════════════════════════════════════════════════════

interface QRGenerateResult {
  qrUrl: string;  // Full URL to encode in QR
  code: string;   // The 32-char hex code for polling
}

/** Call xueqiu API to generate a QR login code */
export async function generateQRCode(wafCookies: string): Promise<QRGenerateResult> {
  const res = await fetch(`${XUEQIU_URL}/snb/provider/generate-qr-code`, {
    method: "POST",
    headers: { ...HEADERS, Cookie: wafCookies },
  });

  if (!res.ok) {
    throw new Error(`QR generate failed: HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!data.success || !data.data?.qr_code) {
    throw new Error(`QR generate failed: ${data.message || JSON.stringify(data)}`);
  }

  const qrUrl = data.data.qr_code;
  // Extract code from URL: https://xueqiu.com/third_party_app_scan_code?src=0&code=<HEX>
  const codeMatch = qrUrl.match(/code=([a-f0-9]+)/i);
  if (!codeMatch) {
    throw new Error(`Could not parse QR code from URL: ${qrUrl}`);
  }

  return { qrUrl, code: codeMatch[1] };
}

// ═══════════════════════════════════════════════════════════════
//  Step 3: Render QR in terminal
// ═══════════════════════════════════════════════════════════════

/** Render a URL as a QR code in the terminal using unicode blocks */
export async function renderQRToTerminal(url: string): Promise<void> {
  // qrcode package toString with "small" mode uses unicode half-blocks
  const qrText = await QRCode.toString(url, {
    type: "terminal",
    small: true,
    margin: 1,
  });
  console.log(qrText);
}

// ═══════════════════════════════════════════════════════════════
//  Step 4: Poll for scan completion
// ═══════════════════════════════════════════════════════════════

interface PollResult {
  status: number;     // 0=waiting, 1=confirmed, 4=expired
  cookies?: string;   // Auth cookies when status=1
}

/**
 * Poll QR scan status until user confirms login.
 * Returns the full cookie string with xq_a_token on success.
 */
export async function pollQRStatus(
  code: string,
  wafCookies: string,
  cdpUrl: string,
  timeoutMs = 120000,
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 2500;

  while (Date.now() - startTime < timeoutMs) {
    const res = await fetch(
      `${XUEQIU_URL}/snb/provider/query-qr-code-state?code=${code}`,
      { headers: { ...HEADERS, Cookie: wafCookies } },
    );

    if (!res.ok) {
      throw new Error(`Poll failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    const status = data.data?.status;

    if (status === 1) {
      // Login confirmed — try Set-Cookie headers first
      const setCookies = res.headers.getSetCookie?.() ?? [];
      if (setCookies.length > 0) {
        const authCookies = setCookies
          .map((sc: string) => sc.split(";")[0])
          .join("; ");
        const merged = mergeCookies(wafCookies, authCookies);
        if (merged.includes("xq_a_token")) return merged;
      }

      // Fallback: after QR scan, Chrome page also gets the auth cookies.
      console.log("\n  Scan confirmed! Extracting auth cookies from Chrome...");
      await new Promise(r => setTimeout(r, 2000));
      try {
        const cookies = await getWafCookies(cdpUrl);
        if (cookies.includes("xq_a_token")) return cookies;
      } catch {}

      throw new Error("Login confirmed but could not extract xq_a_token — try: snowball login --manual");
    }

    if (status === 2) {
      // Scanned, waiting for user to confirm in the app
      process.stdout.write("✓");
      await new Promise(r => setTimeout(r, pollInterval));
      continue;
    }

    if (status === 4) {
      // QR expired — signal caller to regenerate
      return "EXPIRED";
    }

    // status === 0: still waiting
    process.stdout.write(".");
    await new Promise(r => setTimeout(r, pollInterval));
  }

  throw new Error("Login timeout (2 min). QR code may have expired.");
}

/** Merge two cookie strings, later values override earlier ones */
function mergeCookies(base: string, override: string): string {
  const cookies = new Map<string, string>();
  for (const part of base.split("; ")) {
    const [k, ...v] = part.split("=");
    if (k) cookies.set(k.trim(), v.join("="));
  }
  for (const part of override.split("; ")) {
    const [k, ...v] = part.split("=");
    if (k) cookies.set(k.trim(), v.join("="));
  }
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

// ═══════════════════════════════════════════════════════════════
//  Combined: full QR login flow
// ═══════════════════════════════════════════════════════════════

export interface QRLoginResult {
  cookie: string;
  code: string;
}

/**
 * Full QR login: get WAF cookies → generate QR → display → poll → return auth cookies.
 * Chrome must be running with xueqiu.com loaded (for WAF cookies).
 */
export async function qrLogin(cdpUrl: string): Promise<QRLoginResult> {
  // 1. Get WAF cookies from Chrome (retry until WAF resolves)
  console.log("  Waiting for WAF cookies");
  process.stdout.write("  ");
  let wafCookies = "";
  for (let i = 0; i < 15; i++) {
    try {
      wafCookies = await getWafCookies(cdpUrl);
      break;
    } catch {
      process.stdout.write(".");
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  if (!wafCookies) {
    throw new Error("Could not get WAF cookies after 30s — Chrome may not have loaded xueqiu.com");
  }
  console.log("\n  ✓ Got WAF cookies\n");

  // 2–4. Generate → display → poll (retry up to 3 times on QR expiry)
  const MAX_QR_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_QR_ATTEMPTS; attempt++) {
    console.log("  Generating QR code...");
    const { qrUrl, code } = await generateQRCode(wafCookies);
    console.log("  ✓ QR code ready\n");

    console.log("  ┌────────────────────────────────────┐");
    console.log("  │  Scan this QR with the Xueqiu app  │");
    console.log("  └────────────────────────────────────┘\n");
    await renderQRToTerminal(qrUrl);

    console.log("  Waiting for scan (tap 确认登录 in app after scanning)");
    process.stdout.write("  ");
    const cookie = await pollQRStatus(code, wafCookies, cdpUrl);

    if (cookie === "EXPIRED") {
      if (attempt < MAX_QR_ATTEMPTS) {
        console.log(`\n  QR expired. Generating a new one... (${attempt}/${MAX_QR_ATTEMPTS})\n`);
        continue;
      }
      throw new Error("QR code expired 3 times. Try: snowball login --manual");
    }

    return { cookie, code };
  }

  throw new Error("QR login failed after retries");
}
