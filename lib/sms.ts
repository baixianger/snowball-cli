/**
 * Phone + SMS login by driving Xueqiu's own login modal.
 *
 * The page posts /account/sms/send_verification_code.json, then
 * /snb/provider/login with an SM4 encryptData body. Error 20099 makes that
 * same page resubmit with is_register=1. Doing this inside headed Chrome
 * keeps WAF cookies, GeeTest, and the cipher in the site's JavaScript.
 *
 * A second process delivers the SMS code by writing
 * ~/.snowball-cli/sms-login/code (directory 0700, file 0600). A fifo would
 * block that process until this one opened the read end, so a file renamed
 * into place is the channel. GeeTest clicks use one file per command under
 * sms-login/clicks/. A code typed on stdin is accepted too when the stream
 * has data.
 */

import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { connectXueqiuPage, type CdpSession } from "./cdp";
import { secureDirectory, secureFile } from "./private";
import { getWafCookies, hasLoginCookie } from "./qr-terminal";

export interface SmsIpcPaths {
  dir: string;
  code: string;
  clicksDir: string;
  captcha: string;
}

export function smsIpcPaths(dataDir: string): SmsIpcPaths {
  const dir = join(dataDir, "sms-login");
  return {
    dir,
    code: join(dir, "code"),
    clicksDir: join(dir, "clicks"),
    captcha: join(dir, "captcha.png"),
  };
}

/** Drop a code or click left by an earlier attempt. */
export function prepareSmsIpc(dataDir: string): SmsIpcPaths {
  const paths = smsIpcPaths(dataDir);
  secureDirectory(dataDir);
  secureDirectory(paths.dir);
  secureDirectory(paths.clicksDir);
  rmSync(paths.code, { force: true });
  for (const name of safeReaddir(paths.clicksDir)) {
    rmSync(join(paths.clicksDir, name), { force: true });
  }
  return paths;
}

export function normalizeAreaCode(raw: string | undefined): string {
  const digits = (raw ?? "86").trim().replace(/^\+/, "");
  if (!/^\d{1,4}$/.test(digits) || digits === "0") {
    throw new Error("--area-code expects a calling code such as 86 or 45");
  }
  return digits;
}

/** Digits only. +86 is 11 digits, matching the login modal; other codes are 6–14. */
export function normalizePhone(raw: string, areaCode: string): string {
  const digits = raw.trim().replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits)) throw new Error("Phone number must be digits");
  if (areaCode === "86" && !/^\d{11}$/.test(digits)) {
    throw new Error("A +86 phone number must be 11 digits");
  }
  if (areaCode !== "86" && !/^\d{6,14}$/.test(digits)) {
    throw new Error("Phone number must be 6 to 14 digits for this area code");
  }
  return digits;
}

/** 13800138000 → 138****8000. Short values stay masked. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 8) return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  if (digits.length >= 2) return `${digits.slice(0, 1)}****${digits.slice(-1)}`;
  return "****";
}

export function phoneLogLabel(areaCode: string, phone: string): string {
  return `+${areaCode} ${maskPhone(phone)}`;
}

export function normalizeSmsCode(raw: string): string {
  const digits = raw.trim();
  if (!/^\d{4,8}$/.test(digits)) throw new Error("SMS code must be 4 to 8 digits");
  return digits;
}

export interface CaptchaPoint {
  x: number;
  y: number;
}

/** "120,80" or "120,80;340,520". Pixels in the CAPTCHA_REQUIRED screenshot. */
export function parseCaptchaClicks(spec: string): CaptchaPoint[] {
  const parts = spec.split(/[;\s]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    throw new Error("--captcha-click expects x,y pixel coordinates from the CAPTCHA_REQUIRED image");
  }
  return parts.map((part) => {
    const match = /^(\d{1,5}),(\d{1,5})$/.exec(part);
    if (!match) throw new Error("--captcha-click expects x,y pixel coordinates, for example 120,80");
    return { x: Number(match[1]), y: Number(match[2]) };
  });
}

export function writeSmsCode(dataDir: string, raw: string): void {
  const code = normalizeSmsCode(raw);
  const paths = smsIpcPaths(dataDir);
  secureDirectory(dataDir);
  secureDirectory(paths.dir);
  const tmp = `${paths.code}.${process.pid}.tmp`;
  writeFileSync(tmp, `${code}\n`, { encoding: "utf-8", mode: 0o600 });
  secureFile(tmp);
  renameSync(tmp, paths.code);
  secureFile(paths.code);
}

/** Read and remove a code file. Invalid contents are discarded and not returned. */
export function takeSmsCode(dataDir: string): string | null {
  const paths = smsIpcPaths(dataDir);
  if (!existsSync(paths.code)) return null;
  let text = "";
  try {
    text = readFileSync(paths.code, "utf-8");
  } catch {
    return null;
  }
  rmSync(paths.code, { force: true });
  try {
    return normalizeSmsCode(text);
  } catch {
    return null;
  }
}

export function writeCaptchaClicks(dataDir: string, spec: string): number {
  const points = parseCaptchaClicks(spec);
  const paths = smsIpcPaths(dataDir);
  secureDirectory(dataDir);
  secureDirectory(paths.dir);
  secureDirectory(paths.clicksDir);
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const file = join(paths.clicksDir, name);
  const body = points.map((point) => `${point.x},${point.y}`).join("\n") + "\n";
  writeFileSync(file, body, { encoding: "utf-8", mode: 0o600 });
  secureFile(file);
  return points.length;
}

export function takeCaptchaClicks(dataDir: string): CaptchaPoint[] {
  const paths = smsIpcPaths(dataDir);
  if (!existsSync(paths.clicksDir)) return [];
  const names = safeReaddir(paths.clicksDir).sort();
  const points: CaptchaPoint[] = [];
  for (const name of names) {
    const file = join(paths.clicksDir, name);
    let text = "";
    try {
      text = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    rmSync(file, { force: true });
    for (const line of text.split(/\s+/)) {
      if (!line) continue;
      try {
        points.push(...parseCaptchaClicks(line));
      } catch {
        // Ignore a malformed click file rather than logging its contents.
      }
    }
  }
  return points;
}

/** Strip digit runs so a server message cannot echo a phone or a code. */
export function safeServerMessage(raw: unknown): string {
  const text = typeof raw === "string" && raw.trim() ? raw.trim() : "Xueqiu rejected the request";
  return text.replace(/\d{4,}/g, "******").replace(/[\r\n]+/g, " ").slice(0, 180);
}

export function scrubSecrets(message: string, secrets: string[]): string {
  let out = message;
  for (const secret of secrets) {
    if (secret && secret.length >= 4) out = out.split(secret).join("******");
  }
  return out;
}

export type SendOutcome = { ok: true } | { ok: false; message: string };

export function classifySendBody(body: unknown): SendOutcome | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.success === true || record.success === 1) return { ok: true };
  if (record.success === false || record.error_description || record.error_code || record.message) {
    return { ok: false, message: safeServerMessage(record.error_description || record.message) };
  }
  return null;
}

/** GeeTest `available: 1` means the widget must be solved before the SMS post. */
export function geeTestRequiresChallenge(body: unknown): boolean | null {
  if (!body || typeof body !== "object" || !("available" in body)) return null;
  return Boolean((body as { available: unknown }).available);
}

export type LoginOutcome =
  | { kind: "ok" }
  | { kind: "register" }
  | { kind: "image-captcha"; message: string }
  | { kind: "reject"; message: string };

/**
 * Map a /snb/provider/login JSON body the way the web client does.
 * 20099 is the unregistered-number signal: the page resubmits with is_register=1.
 */
export function classifyLoginBody(body: unknown): LoginOutcome | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.error_code === undefined && record.result_code === undefined && record.success === undefined) {
    return null;
  }
  const code = Number(record.error_code ?? record.result_code ?? (record.success === true ? 0 : NaN));
  if (!Number.isFinite(code)) return null;
  if (code === 0) return { kind: "ok" };
  if (code === 20099) return { kind: "register" };
  const message = safeServerMessage(record.error_description || record.message || `Xueqiu login error ${code}`);
  if (code === 20094) return { kind: "image-captcha", message };
  return { kind: "reject", message };
}

export interface SmsFormStatus {
  modal: boolean;
  areaValue: string;
  areaSupported: boolean;
  phoneFilled: boolean;
  agreementChecked: boolean;
  sendVisible: boolean;
}

export interface PhoneLoginOptions {
  phone: string;
  areaCode: string;
  timeoutMs: number;
  dataDir: string;
}

export const PAGE_API = `(() => {
  if (window.__snowballSms) return true;
  function notHidden(el) {
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      if (node.hasAttribute("hidden")) return false;
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
    }
    return true;
  }
  function score(el) {
    let z = 0;
    let fixed = false;
    let depth = 0;
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      depth += 1;
      const style = getComputedStyle(node);
      const value = Number(style.zIndex);
      if (Number.isFinite(value)) z = Math.max(z, value);
      if (style.position === "fixed" || style.position === "absolute") fixed = true;
    }
    return (fixed ? 1000000 : 0) + z * 1000 - depth;
  }
  function modal() {
    const mains = [...document.querySelectorAll('[class*="modal__login__main"]')].filter(notHidden);
    if (mains.length) return mains.reduce((best, node) => score(node) >= score(best) ? node : best);
    const blocks = [...document.querySelectorAll("div")].filter((node) => {
      const text = node.innerText || "";
      return text.includes("验证码登录") && text.includes("发送验证码") && notHidden(node);
    });
    blocks.sort((a, b) => (a.innerText || "").length - (b.innerText || "").length);
    return blocks[0] || null;
  }
  function setNativeValue(el, value) {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (!setter) return false;
    const tracker = el._valueTracker;
    if (tracker) tracker.setValue("");
    setter.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
    return true;
  }
  function optionMatches(option, code) {
    if (option.value === code) return "value";
    const text = (option.textContent || "").replace(/\\s/g, "");
    return text.endsWith("+" + code) ? "label" : "";
  }
  window.__snowballSms = {
    notHidden,
    open() {
      const nodes = [...document.querySelectorAll("a,button,div,span")];
      const link = nodes.find((node) => (node.innerText || "").trim() === "立即登录/注册" && notHidden(node) && node.children.length === 0)
        || nodes.find((node) => /btn--login/.test(String(node.className || "")) && notHidden(node));
      if (link) link.click();
      return Boolean(link || modal());
    },
    overlay() {
      const root = modal();
      return Boolean(root && score(root) >= 1000000);
    },
    status(areaCode, phone) {
      const root = modal();
      if (!root) {
        return { modal: false, areaValue: "", areaSupported: false, phoneFilled: false, agreementChecked: false, sendVisible: false };
      }
      const selects = [...root.querySelectorAll("select")].filter(notHidden);
      let supported = false;
      let areaValue = "";
      for (const select of selects) {
        const exact = [...select.options].find((option) => optionMatches(option, areaCode) === "value");
        const labeled = [...select.options].filter((option) => optionMatches(option, areaCode));
        const chosen = exact || (labeled.length === 1 ? labeled[0] : null);
        if (chosen) {
          supported = true;
          areaValue = select.value;
          break;
        }
      }
      const phoneInput = [...root.querySelectorAll("input")].find((input) => input.placeholder === "请输入手机号" && notHidden(input));
      const send = [...root.querySelectorAll("a,button,span")].find((node) => (node.textContent || "").trim() === "发送验证码" && notHidden(node));
      const unchecked = [...root.querySelectorAll('[class*="nochecked"]')].some(notHidden);
      return {
        modal: true,
        areaValue,
        areaSupported: supported,
        phoneFilled: Boolean(phoneInput && phoneInput.value === phone),
        agreementChecked: !unchecked,
        sendVisible: Boolean(send),
      };
    },
    setArea(areaCode) {
      const root = modal();
      if (!root) return { ok: false, reason: "no-modal" };
      const selects = [...root.querySelectorAll("select")].filter(notHidden);
      let match = null;
      for (const select of selects) {
        const exact = [...select.options].find((option) => optionMatches(option, areaCode) === "value");
        if (exact) { match = { select, option: exact }; break; }
        const labeled = [...select.options].filter((option) => optionMatches(option, areaCode));
        if (labeled.length === 1) match = { select, option: labeled[0] };
      }
      if (!match) return { ok: false, reason: "unsupported" };
      setNativeValue(match.select, match.option.value);
      return { ok: match.select.value === match.option.value, value: match.select.value };
    },
    setPhone(phone) {
      const root = modal();
      const input = root && [...root.querySelectorAll("input")].find((node) => node.placeholder === "请输入手机号" && notHidden(node));
      if (!input) return { ok: false, reason: "no-input" };
      setNativeValue(input, phone);
      return { ok: input.value === phone };
    },
    acceptAgreement() {
      const root = modal();
      if (!root) return { ok: false };
      const icon = [...root.querySelectorAll('[class*="nochecked"]')].find(notHidden);
      if (icon) icon.click();
      const still = [...root.querySelectorAll('[class*="nochecked"]')].some(notHidden);
      return { ok: !still };
    },
    clickSend() {
      const root = modal();
      const button = root && [...root.querySelectorAll("a,button,span")].find((node) => (node.textContent || "").trim() === "发送验证码" && notHidden(node) && node.children.length === 0);
      if (!button) return { ok: false };
      button.click();
      return { ok: true };
    },
    setCode(code) {
      const root = modal();
      const input = root && [...root.querySelectorAll("input")].find((node) => node.placeholder === "请输入验证码" && notHidden(node));
      if (!input) return { ok: false, reason: "no-input" };
      setNativeValue(input, code);
      return { ok: input.value === code };
    },
    clickLogin() {
      const root = modal();
      const button = root && [...root.querySelectorAll('[class*="modal__login__btn"]')].find((node) => {
        const text = (node.innerText || "").replace(/\\s/g, "");
        return text === "登录" && notHidden(node);
      });
      if (!button) return { ok: false };
      button.click();
      return { ok: true };
    },
    geetest() {
      const panel = document.querySelector(".geetest_panel");
      if (!panel) return { open: false, marker: "", text: "" };
      const style = getComputedStyle(panel);
      const box = panel.getBoundingClientRect();
      const open = style.display !== "none" && style.visibility !== "hidden" && box.width > 40 && box.height > 40;
      const image = panel.querySelector("img");
      const marker = image && image.src ? String(image.src).slice(0, 160) : (panel.className || "").slice(0, 160);
      const text = (panel.innerText || "").replace(/\\s+/g, " ").slice(0, 80);
      return { open, marker, text };
    },
    toast() {
      const text = document.body ? document.body.innerText || "" : "";
      const known = ["请阅读并勾选协议", "请输入手机号", "请输入正确的手机号"];
      return known.find((item) => text.includes(item)) || "";
    },
  };
  return true;
})()`;

interface TrafficHit {
  url: string;
  status: number;
  body: unknown;
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split("?")[0];
  }
}

function watchTraffic(session: CdpSession): { drain: () => Promise<TrafficHit[]> } {
  const queue: { requestId: string; url: string; status: number }[] = [];
  session.onEvent((method, params) => {
    if (method !== "Network.responseReceived") return;
    const url = String(params.response?.url || "");
    const path = pathnameOf(url);
    if (!/send_verification_code\.json$|\/snb\/provider\/login$|\/gee_test\/get$/.test(path)) return;
    queue.push({
      requestId: String(params.requestId),
      url: path,
      status: Number(params.response?.status || 0),
    });
  });
  const seen = new Set<string>();
  const attempts = new Map<string, number>();
  return {
    async drain() {
      const batch = queue.splice(0);
      const hits: TrafficHit[] = [];
      for (const item of batch) {
        if (seen.has(item.requestId)) continue;
        try {
          const result = await session.send("Network.getResponseBody", { requestId: item.requestId }, 8000);
          seen.add(item.requestId);
          const text = result.base64Encoded
            ? Buffer.from(result.body, "base64").toString("utf8")
            : String(result.body ?? "");
          let body: unknown = null;
          try { body = JSON.parse(text); } catch { body = null; }
          hits.push({ url: item.url, status: item.status, body });
        } catch {
          const count = (attempts.get(item.requestId) ?? 0) + 1;
          attempts.set(item.requestId, count);
          if (count < 5) queue.push(item);
        }
      }
      return hits;
    },
  };
}

async function evalValue<T>(session: CdpSession, expression: string): Promise<T> {
  const result = await session.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text || "page script failed";
    throw new Error(String(description).split("\n")[0]);
  }
  return result.result?.value as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWhenReady(cdpUrl: string): Promise<CdpSession> {
  const deadline = Date.now() + 20000;
  let last = "No xueqiu.com tab found in Chrome";
  while (Date.now() < deadline) {
    try {
      const session = await connectXueqiuPage(cdpUrl);
      const ready = await evalValue<string>(session, "document.readyState");
      const title = await evalValue<string>(session, "document.title || ''");
      if (ready === "complete" && title && !/拦截|请求异常/.test(title)) return session;
      session.close();
    } catch (error: any) {
      last = error?.message || last;
    }
    await sleep(400);
  }
  throw new Error(last);
}

/** Open the modal, check the agreement, and fill the phone. Does not click 发送验证码. */
export async function preparePhoneForm(session: CdpSession, phone: string, areaCode: string): Promise<SmsFormStatus> {
  await evalValue(session, PAGE_API);
  await evalValue(session, "window.__snowballSms.open()");
  const overlayDeadline = Date.now() + 8000;
  while (Date.now() < overlayDeadline) {
    if (await evalValue<boolean>(session, "window.__snowballSms.overlay()")) break;
    await sleep(200);
  }
  const deadline = Date.now() + 10000;
  let status = await evalValue<SmsFormStatus>(session, `window.__snowballSms.status(${JSON.stringify(areaCode)}, ${JSON.stringify(phone)})`);
  while (!status.modal && Date.now() < deadline) {
    await sleep(300);
    status = await evalValue<SmsFormStatus>(session, `window.__snowballSms.status(${JSON.stringify(areaCode)}, ${JSON.stringify(phone)})`);
  }
  if (!status.modal) throw new Error("Could not open the Xueqiu login modal");

  const area = await evalValue<{ ok: boolean; reason?: string }>(session, `window.__snowballSms.setArea(${JSON.stringify(areaCode)})`);
  if (!area.ok) {
    throw new Error(
      area.reason === "unsupported"
        ? `Area code +${areaCode} is not in the Xueqiu login list`
        : "Could not set the area code on the login form",
    );
  }
  const filled = await evalValue<{ ok: boolean }>(session, `window.__snowballSms.setPhone(${JSON.stringify(phone)})`);
  if (!filled.ok) throw new Error("Could not fill the phone number on the login form");

  for (let attempt = 0; attempt < 4; attempt++) {
    const agreed = await evalValue<{ ok: boolean }>(session, "window.__snowballSms.acceptAgreement()");
    if (agreed.ok) break;
    await sleep(200);
  }

  status = await evalValue<SmsFormStatus>(session, `window.__snowballSms.status(${JSON.stringify(areaCode)}, ${JSON.stringify(phone)})`);
  if (!status.agreementChecked) throw new Error("Could not check the Xueqiu agreement box");
  if (!status.phoneFilled) throw new Error("The login form did not keep the phone number");
  if (!status.sendVisible) throw new Error("The 发送验证码 button is not visible");
  return status;
}

function attachStdinCodes(onCode: (code: string) => void): () => void {
  const stdin = process.stdin;
  if (!stdin || !stdin.readable) return () => {};
  let buffer = "";
  const onData = (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      try {
        onCode(normalizeSmsCode(line));
      } catch {
        // Not a code. Ignore it and do not print the line.
      }
      newline = buffer.indexOf("\n");
    }
  };
  stdin.setEncoding("utf8");
  stdin.on("data", onData);
  stdin.resume();
  return () => {
    stdin.off("data", onData);
    stdin.pause();
  };
}

async function saveCaptchaPng(session: CdpSession, file: string): Promise<string> {
  const shot = await session.send("Page.captureScreenshot", { format: "png" });
  mkdirSync(join(file, ".."), { recursive: true, mode: 0o700 });
  writeFileSync(file, Buffer.from(shot.data, "base64"), { mode: 0o600 });
  secureFile(file);
  return file;
}

async function dispatchClicks(session: CdpSession, dataDir: string): Promise<void> {
  for (const point of takeCaptchaClicks(dataDir)) {
    await session.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: point.x,
      y: point.y,
      button: "left",
      clickCount: 1,
    });
    await session.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: point.x,
      y: point.y,
      button: "left",
      clickCount: 1,
    });
    await sleep(150);
  }
}

/**
 * Full SMS login. Returns the cookie string once xq_is_login is set.
 * Prints SMS_SENT=1, CAPTCHA_REQUIRED=<path>, SMS_CODE_REJECTED=1, and SMS_ERROR=...
 * The caller prints LOGIN_OK=1 after the token file is saved.
 */
export async function runPhoneLogin(cdpUrl: string, options: PhoneLoginOptions): Promise<string> {
  const phone = options.phone;
  const areaCode = options.areaCode;
  const secrets = [phone];
  const deadline = Date.now() + options.timeoutMs;
  const paths = prepareSmsIpc(options.dataDir);
  const queued: string[] = [];
  const stopStdin = attachStdinCodes((code) => queued.push(code));

  let session: CdpSession | null = null;
  try {
    await getWafCookies(cdpUrl);
    session = await connectWhenReady(cdpUrl);
    const traffic = watchTraffic(session);
    console.log(`  Opening the Xueqiu login modal for ${phoneLogLabel(areaCode, phone)}.`);
    await preparePhoneForm(session, phone, areaCode);

    const clicked = await evalValue<{ ok: boolean }>(session, "window.__snowballSms.clickSend()");
    if (!clicked.ok) throw new Error("Could not click 发送验证码");

    const sent = await waitForSmsSend(session, traffic, paths.captcha, options.dataDir, deadline);
    if (!sent.ok) throw new Error(sent.message);
    console.log("SMS_SENT=1");
    console.log(`  SMS sent to ${phoneLogLabel(areaCode, phone)}.`);
    console.log("  From another shell: snowball login --sms-code <code>");
    console.log("  That writes ~/.snowball-cli/sms-login/code (mode 0600). A code typed into this terminal is accepted too.");

    return await waitForLogin(session, traffic, paths.captcha, options.dataDir, deadline, queued, secrets, cdpUrl);
  } catch (error: any) {
    throw new Error(scrubSecrets(error?.message || "SMS login failed", secrets));
  } finally {
    stopStdin();
    session?.close();
  }
}

async function announceCaptcha(session: CdpSession, file: string, seen: Set<string>, marker: string): Promise<void> {
  if (seen.has(marker)) return;
  seen.add(marker);
  const path = await saveCaptchaPng(session, file);
  console.log(`CAPTCHA_REQUIRED=${path}`);
  console.log("  GeeTest is showing. Solve it in the browser, or click the screenshot from another shell:");
  console.log("  snowball login --captcha-click x,y");
  console.log("  Coordinates are pixels in that PNG (top-left origin). Repeat for each click, including 确认.");
}

async function waitForSmsSend(
  session: CdpSession,
  traffic: { drain: () => Promise<TrafficHit[]> },
  captchaFile: string,
  dataDir: string,
  deadline: number,
): Promise<SendOutcome> {
  const announced = new Set<string>();
  let sawChallenge = false;
  const firstSlice = Math.min(deadline, Date.now() + 20000);
  while (Date.now() < firstSlice) {
    const read = await readSendHits(traffic);
    if (read.challenge) sawChallenge = true;
    if (read.send) return read.send;
    const panel = await evalValue<{ open: boolean; marker: string }>(session, "window.__snowballSms.geetest()");
    if (panel.open) {
      sawChallenge = true;
      await announceCaptcha(session, captchaFile, announced, panel.marker || "panel");
      break;
    }
    const toast = await evalValue<string>(session, "window.__snowballSms.toast()");
    if (toast) return { ok: false, message: toast };
    await sleep(300);
  }

  if (!sawChallenge && Date.now() >= firstSlice) {
    const late = await readSendHits(traffic);
    if (late.send) return late.send;
    const panel = await evalValue<{ open: boolean }>(session, "window.__snowballSms.geetest()");
    if (!panel.open) {
      return { ok: false, message: "发送验证码 did not reach Xueqiu, and no GeeTest challenge appeared" };
    }
    sawChallenge = true;
  }

  while (Date.now() < deadline) {
    const panel = await evalValue<{ open: boolean; marker: string }>(session, "window.__snowballSms.geetest()");
    if (panel.open) await announceCaptcha(session, captchaFile, announced, panel.marker || "panel");
    if (panel.open) await dispatchClicks(session, dataDir);
    const read = await readSendHits(traffic);
    if (read.send) return read.send;
    const toast = await evalValue<string>(session, "window.__snowballSms.toast()");
    if (toast && !panel.open) return { ok: false, message: toast };
    await sleep(300);
  }
  return { ok: false, message: "Timed out waiting for the GeeTest challenge before the SMS could be sent" };
}

async function readSendHits(
  traffic: { drain: () => Promise<TrafficHit[]> },
): Promise<{ send: SendOutcome | null; challenge: boolean }> {
  let send: SendOutcome | null = null;
  let challenge = false;
  for (const hit of await traffic.drain()) {
    if (hit.url.endsWith("/gee_test/get")) {
      if (geeTestRequiresChallenge(hit.body)) challenge = true;
      continue;
    }
    if (!hit.url.endsWith("/account/sms/send_verification_code.json")) continue;
    const classified = classifySendBody(hit.body);
    if (classified) send = classified;
    else if (hit.status >= 400) send = { ok: false, message: `Xueqiu refused the SMS request (HTTP ${hit.status})` };
  }
  return { send, challenge };
}

async function waitForLogin(
  session: CdpSession,
  traffic: { drain: () => Promise<TrafficHit[]> },
  captchaFile: string,
  dataDir: string,
  deadline: number,
  queued: string[],
  secrets: string[],
  cdpUrl: string,
): Promise<string> {
  const announced = new Set<string>();
  let submitting = false;
  let sawRegister = false;
  let registerAt = 0;
  let submitAt = 0;

  while (Date.now() < deadline) {
    const fromFile = takeSmsCode(dataDir);
    if (fromFile) queued.push(fromFile);

    const panel = await evalValue<{ open: boolean; marker: string }>(session, "window.__snowballSms.geetest()");
    if (panel.open) {
      await announceCaptcha(session, captchaFile, announced, panel.marker || "login-panel");
      await dispatchClicks(session, dataDir);
    }

    if (!submitting && queued.length > 0 && !panel.open) {
      const code = queued.shift()!;
      secrets.push(code);
      const filled = await evalValue<{ ok: boolean }>(session, `window.__snowballSms.setCode(${JSON.stringify(code)})`);
      if (!filled.ok) throw new Error("Could not fill the verification code");
      const clicked = await evalValue<{ ok: boolean }>(session, "window.__snowballSms.clickLogin()");
      if (!clicked.ok) throw new Error("Could not click 登录");
      submitting = true;
      submitAt = Date.now();
      sawRegister = false;
    }

    for (const hit of await traffic.drain()) {
      if (!hit.url.endsWith("/snb/provider/login")) continue;
      const outcome = classifyLoginBody(hit.body);
      if (!outcome) continue;
      if (outcome.kind === "register") {
        sawRegister = true;
        registerAt = Date.now();
        continue;
      }
      if (outcome.kind === "ok") {
        const cookie = await waitForLoginCookie(cdpUrl);
        if (!cookie) throw new Error("Xueqiu accepted the login but xq_is_login was not set");
        return cookie;
      }
      if (outcome.kind === "image-captcha") {
        await announceCaptcha(session, captchaFile, announced, `image-${Date.now()}`);
      }
      console.log("SMS_CODE_REJECTED=1");
      console.log(`SMS_ERROR=${outcome.message}`);
      submitting = false;
      sawRegister = false;
    }

    if (submitting && sawRegister && !panel.open && Date.now() - registerAt > 8000) {
      const again = await evalValue<{ ok: boolean }>(session, "window.__snowballSms.clickLogin()");
      if (!again.ok) throw new Error("Xueqiu returned 20099 but the register resubmit could not be clicked");
      sawRegister = false;
      registerAt = Date.now();
    } else if (submitting && !sawRegister && !panel.open && submitAt && Date.now() - submitAt > 20000) {
      console.log("SMS_CODE_REJECTED=1");
      console.log("SMS_ERROR=Timed out waiting for Xueqiu to accept the code");
      submitting = false;
      submitAt = 0;
    }
    await sleep(300);
  }
  throw new Error("Timed out waiting for the SMS code");
}

async function waitForLoginCookie(cdpUrl: string): Promise<string | null> {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const cookie = await getWafCookies(cdpUrl);
      if (hasLoginCookie(cookie)) return cookie;
    } catch {
      // The page may still be applying Set-Cookie.
    }
    await sleep(400);
  }
  return null;
}

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}
