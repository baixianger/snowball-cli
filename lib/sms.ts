/**
 * Phone + SMS login.
 *
 * `snowball login --phone` opens the real www.xueqiu.com modal in headed
 * Chrome, sends the SMS, and writes ~/.snowball-cli/sms-login/session.json
 * (directory 0700, file 0600) before it asks for anything. A TTY then
 * prompts for the code and finishes in the same process. No TTY, or
 * --no-wait, prints SMS_SENT=1 and exits. `snowball login --sms-code`
 * loads that file and POSTs /snb/provider/login, so killing the prompt
 * does not lose the code and does not send a second SMS.
 *
 * GeeTest clicks only work on the widget that is open. The interactive
 * prompt happens while Chrome is still up. `--captcha-click` starts a new
 * widget and applies the coordinates there.
 */

import { writeFileSync } from "fs";
import { connectXueqiuPage, type CdpSession } from "./cdp";
import { ensureChrome, openXueqiuTab, stopSnowballChrome, stopStartedXvfb } from "./browser";
import { secureDirectory, secureFile } from "./private";
import { fetchXueqiu, getWafCookies, hasLoginCookie, mergeCookies, XUEQIU_ORIGIN } from "./qr-terminal";
import {
  SMS_CODE_ATTEMPTS,
  SMS_CODE_PROMPT,
  SMS_SESSION_TTL_MS,
  CAPTCHA_CLICK_PROMPT,
  buildLoginPlain,
  captchaPhaseMessage,
  clearSmsSession,
  decryptDeviceInfo,
  decryptXueqiu,
  encryptXueqiu,
  geetestFromSendBody,
  loadSmsSession,
  loginRequestBodies,
  looksLikeBodyMismatch,
  parseSendPost,
  saveSmsSession,
  sessionProblemMessage,
  smsLoginPaths,
  type SmsGeetestFields,
  type SmsSession,
} from "./sms-http";

export {
  SMS_CODE_ATTEMPTS,
  SMS_CODE_PROMPT,
  SMS_SESSION_TTL_MS,
  CAPTCHA_CLICK_PROMPT,
  captchaPhaseMessage,
  clearSmsSession,
  loadSmsSession,
  saveSmsSession,
  sessionProblemMessage,
  shouldPromptForSms,
  smsLoginPaths,
} from "./sms-http";

export type { SmsSession } from "./sms-http";

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

export type SmsCommandResult =
  | { status: "logged-in"; cookie: string }
  | { status: "pending" }
  | { status: "rejected"; reason: "code" | "incomplete" };

export interface PhoneLoginOptions {
  phone: string;
  areaCode: string;
  timeoutMs: number;
  dataDir: string;
  interactive: boolean;
  chromePath?: string;
}

export interface CaptchaClickOptions {
  spec: string;
  timeoutMs: number;
  dataDir: string;
  chromePath?: string;
}

export type XueqiuFetch = typeof fetchXueqiu;

const LOGIN_URL = `${XUEQIU_ORIGIN}/snb/provider/login`;

type LoginHttpResult =
  | { kind: "ok"; cookie: string }
  | { kind: "register"; cookie: string }
  | { kind: "reject"; message: string }
  | { kind: "image-captcha"; message: string }
  | { kind: "needs-browser"; message: string }
  | { kind: "transport" }
  | { kind: "error"; message: string };

interface TrafficSnap {
  xqGeetest: string;
  geetest: SmsGeetestFields;
  send: SendOutcome | null;
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split("?")[0];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function watchSms(session: CdpSession): { drain: () => Promise<TrafficSnap> } {
  let xqGeetest = "";
  let geetest: SmsGeetestFields = {};
  let send: SendOutcome | null = null;
  const pendingResp: { requestId: string; url: string; status: number }[] = [];
  const pendingReq: { requestId: string; postData: string }[] = [];

  session.onEvent((method, params) => {
    if (method === "Network.requestWillBeSent") {
      const path = pathnameOf(String(params.request?.url || ""));
      if (!path.endsWith("/account/sms/send_verification_code.json")) return;
      pendingReq.push({
        requestId: String(params.requestId),
        postData: typeof params.request?.postData === "string" ? params.request.postData : "",
      });
      return;
    }
    if (method !== "Network.responseReceived") return;
    const path = pathnameOf(String(params.response?.url || ""));
    if (!/send_verification_code\.json$|\/gee_test\/get$/.test(path)) return;
    pendingResp.push({
      requestId: String(params.requestId),
      url: path,
      status: Number(params.response?.status || 0),
    });
  });

  const seenResp = new Set<string>();
  const seenReq = new Set<string>();
  const respAttempts = new Map<string, number>();

  return {
    async drain() {
      const requests = pendingReq.splice(0);
      for (const item of requests) {
        if (seenReq.has(item.requestId)) continue;
        let post = item.postData;
        if (!post) {
          try {
            const result = await session.send("Network.getRequestPostData", { requestId: item.requestId }, 8000);
            post = String(result.postData || "");
          } catch {
            pendingReq.push(item);
            continue;
          }
        }
        seenReq.add(item.requestId);
        const fields = geetestFromSendBody(parseSendPost(post));
        if (fields.xqGeetest) xqGeetest = fields.xqGeetest;
        geetest = { ...geetest, ...fields.geetest };
      }

      const responses = pendingResp.splice(0);
      for (const item of responses) {
        if (seenResp.has(item.requestId)) continue;
        try {
          const result = await session.send("Network.getResponseBody", { requestId: item.requestId }, 8000);
          seenResp.add(item.requestId);
          const text = result.base64Encoded
            ? Buffer.from(result.body, "base64").toString("utf8")
            : String(result.body ?? "");
          let body: unknown = null;
          try { body = JSON.parse(text); } catch { body = null; }
          if (item.url.endsWith("/gee_test/get")) {
            const record = body && typeof body === "object" ? body as Record<string, unknown> : null;
            if (!xqGeetest && record && typeof record.xq_geetest === "string") xqGeetest = record.xq_geetest;
            continue;
          }
          const classified = classifySendBody(body);
          if (classified) send = classified;
          else if (item.status >= 400) send = { ok: false, message: `Xueqiu refused the SMS request (HTTP ${item.status})` };
        } catch {
          const count = (respAttempts.get(item.requestId) ?? 0) + 1;
          respAttempts.set(item.requestId, count);
          if (count < 5) pendingResp.push(item);
        }
      }
      return { xqGeetest, geetest: { ...geetest }, send };
    },
  };
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

async function readDeviceInfo(session: CdpSession): Promise<{ secret: string; deviceId: string }> {
  const deadline = Date.now() + 8000;
  let last = "Xueqiu device info is missing";
  while (Date.now() < deadline) {
    const raw = await evalValue<string>(session, "localStorage.getItem('DEVICE_INFO') || ''");
    if (raw) {
      try {
        return decryptDeviceInfo(raw);
      } catch (error: any) {
        last = error?.message || last;
      }
    }
    await sleep(300);
  }
  throw new Error(last);
}

async function readCookie(cdpUrl: string): Promise<string> {
  const deadline = Date.now() + 8000;
  let last = "No device_id cookie — page may not have loaded yet";
  while (Date.now() < deadline) {
    try {
      return await getWafCookies(cdpUrl);
    } catch (error: any) {
      last = error?.message || last;
    }
    await sleep(400);
  }
  throw new Error(last);
}

async function saveCaptchaPng(session: CdpSession, dataDir: string): Promise<string> {
  const paths = smsLoginPaths(dataDir);
  secureDirectory(dataDir);
  secureDirectory(paths.dir);
  const shot = await session.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(paths.captcha, Buffer.from(shot.data, "base64"), { mode: 0o600 });
  secureFile(paths.captcha);
  return paths.captcha;
}

async function dispatchPoints(session: CdpSession, points: CaptchaPoint[]): Promise<void> {
  try { await session.send("Page.bringToFront"); } catch { /* The click still targets this page. */ }
  for (const point of points) {
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

/** Read one line from a TTY. Null means stdin closed or this is not a TTY. */
export async function readPromptLine(prompt: string): Promise<string | null> {
  if (!process.stdin.isTTY) return null;
  process.stdout.write(`${prompt} `);
  const stdin = process.stdin;
  stdin.setEncoding("utf8");
  return await new Promise((resolve) => {
    let buf = "";
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.off("end", onEnd);
      stdin.pause();
    };
    const onData = (chunk: string) => {
      buf += chunk;
      const newline = buf.indexOf("\n");
      if (newline >= 0) {
        cleanup();
        resolve(buf.slice(0, newline).replace(/\r$/, ""));
      }
    };
    const onEnd = () => {
      cleanup();
      const line = buf.replace(/\r$/, "").trim();
      resolve(line ? line : null);
    };
    stdin.on("data", onData);
    stdin.on("end", onEnd);
    stdin.resume();
  });
}

function draftSession(
  phone: string,
  areaCode: string,
  phase: SmsSession["phase"],
  cookie: string,
  device: { secret: string; deviceId: string },
  traffic: TrafficSnap,
): SmsSession {
  return {
    version: 1,
    createdAt: Date.now(),
    phase,
    areaCode,
    phone,
    maskedPhone: maskPhone(phone),
    cookie,
    deviceId: device.deviceId,
    deviceSecret: device.secret,
    xqGeetest: traffic.xqGeetest,
    geetest: traffic.geetest,
  };
}

interface DriveOptions {
  cdpUrl: string;
  phone: string;
  areaCode: string;
  timeoutMs: number;
  dataDir: string;
  chromePath?: string;
  /** Prompt for click coordinates while the widget is open. */
  interactiveClicks: boolean;
  /** Applied once, to the widget this launch opens. */
  presetClicks?: CaptchaPoint[];
}

/**
 * Send the SMS. The session file is on disk before this returns, and Chrome
 * is stopped. "captcha-pending" means the PNG path was printed and the
 * process should exit without a code prompt.
 */
async function driveUntilSmsSent(options: DriveOptions): Promise<"sent" | "captcha-pending"> {
  const deadline = Date.now() + options.timeoutMs;
  const preset = options.presetClicks ?? [];
  let page: CdpSession | null = null;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try { page?.close(); } catch { /* already closed */ }
    stopSnowballChrome();
    stopStartedXvfb();
  };

  try {
    await ensureChrome(options.cdpUrl, options.chromePath);
    console.log("  Opening xueqiu.com...\n");
    await openXueqiuTab(options.cdpUrl);
    await readCookie(options.cdpUrl);
    page = await connectWhenReady(options.cdpUrl);
    const traffic = watchSms(page);
    console.log(`  Opening the Xueqiu login modal for ${phoneLogLabel(options.areaCode, options.phone)}.`);
    await preparePhoneForm(page, options.phone, options.areaCode);
    const device = await readDeviceInfo(page);
    const cookie = await readCookie(options.cdpUrl);

    const clicked = await evalValue<{ ok: boolean }>(page, "window.__snowballSms.clickSend()");
    if (!clicked.ok) throw new Error("Could not click 发送验证码");

    const announced = new Set<string>();
    const prompted = new Set<string>();
    let presetUsed = false;
    let captchaPrompts = 0;
    let sawPanel = false;
    const firstSlice = Math.min(deadline, Date.now() + 20000);

    const persist = async (phase: SmsSession["phase"], snap: TrafficSnap) => {
      let current = cookie;
      try {
        current = await getWafCookies(options.cdpUrl);
      } catch {
        // Keep the cookie captured before the click.
      }
      saveSmsSession(options.dataDir, draftSession(options.phone, options.areaCode, phase, current, device, snap));
    };

    while (Date.now() < deadline) {
      const snap = await traffic.drain();
      if (snap.send?.ok) {
        await persist("sent", snap);
        return "sent";
      }
      if (snap.send && !snap.send.ok) throw new Error(snap.send.message);

      const panel = await evalValue<{ open: boolean; marker: string }>(page, "window.__snowballSms.geetest()");
      if (panel.open) {
        sawPanel = true;
        const marker = panel.marker || "panel";
        if (!announced.has(marker)) {
          announced.add(marker);
          const png = await saveCaptchaPng(page, options.dataDir);
          console.log(`CAPTCHA_REQUIRED=${png}`);
          await persist("captcha", snap);
          if (!options.interactiveClicks && preset.length === 0) {
            console.log("  Session saved. Finish GeeTest with: snowball login --captcha-click x,y");
            return "captcha-pending";
          }
        }
        if (preset.length > 0 && !presetUsed) {
          presetUsed = true;
          await dispatchPoints(page, preset);
        } else if (options.interactiveClicks && !prompted.has(marker)) {
          prompted.add(marker);
          captchaPrompts += 1;
          if (captchaPrompts > 6) {
            throw new Error("GeeTest was not solved. The session is saved; run snowball login --captcha-click x,y");
          }
          const line = await readPromptLine(CAPTCHA_CLICK_PROMPT);
          if (line === null) {
            console.log("  stdin closed. Finish GeeTest with: snowball login --captcha-click x,y");
            return "captcha-pending";
          }
          let points: CaptchaPoint[];
          try {
            points = parseCaptchaClicks(line);
          } catch (error: any) {
            prompted.delete(marker);
            console.error(`  ${error?.message || "Could not read the click coordinates"}`);
            continue;
          }
          await dispatchPoints(page, points);
          const until = Date.now() + 3000;
          while (Date.now() < until) {
            const after = await traffic.drain();
            if (after.send?.ok) {
              await persist("sent", after);
              return "sent";
            }
            if (after.send && !after.send.ok) throw new Error(after.send.message);
            await sleep(200);
          }
          const still = await evalValue<{ open: boolean; marker: string }>(page, "window.__snowballSms.geetest()");
          if (still.open) prompted.delete(still.marker || marker);
        }
      }

      const toast = await evalValue<string>(page, "window.__snowballSms.toast()");
      if (toast && !panel.open) throw new Error(toast);

      if (!sawPanel && Date.now() >= firstSlice) {
        const late = await traffic.drain();
        if (late.send?.ok) {
          await persist("sent", late);
          return "sent";
        }
        if (late.send && !late.send.ok) throw new Error(late.send.message);
        const latePanel = await evalValue<{ open: boolean }>(page, "window.__snowballSms.geetest()");
        if (!latePanel.open) {
          throw new Error("发送验证码 did not reach Xueqiu, and no GeeTest challenge appeared");
        }
      }
      await sleep(300);
    }
    throw new Error(sawPanel
      ? "Timed out waiting for the GeeTest challenge before the SMS could be sent"
      : "Timed out waiting for Xueqiu to send the SMS");
  } finally {
    release();
  }
}

function cookieFromPayload(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;
  if (typeof record.cookie === "string") return record.cookie;
  const pairs: string[] = [];
  for (const key of ["xq_is_login", "xq_a_token", "u", "xq_id_token"]) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") pairs.push(`${key}=${value}`);
  }
  return pairs.join("; ");
}

function absorbLoginPayload(cookie: string, body: unknown, secret: string): string {
  if (hasLoginCookie(cookie)) return cookie;
  if (!body || typeof body !== "object" || !secret) return cookie;
  const data = (body as { data?: unknown }).data;
  if (typeof data !== "string" || !data) return cookie;
  try {
    const decoded = JSON.parse(decryptXueqiu(data, secret));
    return mergeCookies(cookie, cookieFromPayload(decoded));
  } catch {
    return cookie;
  }
}

async function postOnce(
  session: SmsSession,
  code: string,
  isRegister: boolean,
  fetchImpl: XueqiuFetch,
  preferred: { index: number },
): Promise<LoginHttpResult> {
  const hex = encryptXueqiu(JSON.stringify(buildLoginPlain(session, code, isRegister)));
  const bodies = loginRequestBodies(hex);
  let cookie = session.cookie;
  let last: LoginHttpResult = { kind: "transport" };
  for (let offset = 0; offset < bodies.length; offset++) {
    const index = (preferred.index + offset) % bodies.length;
    const spec = bodies[index];
    let posted: { response: Response; cookie: string };
    try {
      posted = await fetchImpl(LOGIN_URL, cookie, {
        method: "POST",
        headers: { "Content-Type": spec.contentType },
        body: spec.body,
      });
    } catch (error: any) {
      throw new Error(error?.message || "Xueqiu login request failed");
    }
    cookie = posted.cookie;
    const raw = await posted.response.text();
    let json: unknown = null;
    try { json = raw ? JSON.parse(raw) : null; } catch { json = null; }
    const outcome = classifyLoginBody(json);
    if (!outcome) {
      last = { kind: "transport" };
      continue;
    }
    if (outcome.kind === "reject" && looksLikeBodyMismatch(outcome.message)) {
      last = { kind: "reject", message: outcome.message };
      continue;
    }
    preferred.index = index;
    if (outcome.kind === "ok") {
      const next = absorbLoginPayload(cookie, json, session.deviceSecret);
      if (!hasLoginCookie(next)) {
        return { kind: "needs-browser", message: "Xueqiu accepted the login response but did not set xq_is_login" };
      }
      return { kind: "ok", cookie: next };
    }
    if (outcome.kind === "register") return { kind: "register", cookie };
    if (outcome.kind === "image-captcha") return { kind: "image-captcha", message: outcome.message };
    return { kind: "reject", message: outcome.message };
  }
  return last.kind === "reject" ? last : { kind: "transport" };
}

export async function submitSmsLogin(
  session: SmsSession,
  code: string,
  fetchImpl: XueqiuFetch = fetchXueqiu,
): Promise<Exclude<LoginHttpResult, { kind: "register" }>> {
  const preferred = { index: 0 };
  const first = await postOnce(session, code, false, fetchImpl, preferred);
  if (first.kind !== "register") return first;
  const second = await postOnce({ ...session, cookie: first.cookie }, code, true, fetchImpl, preferred);
  if (second.kind === "register") {
    return { kind: "error", message: "Xueqiu still returned 20099 after registering" };
  }
  return second;
}

function assertSendable(session: SmsSession): void {
  if (!session.deviceSecret || !session.deviceId) {
    throw new Error("The SMS session is missing Xueqiu device info. Run snowball login --phone again.");
  }
}

function assertFresh(session: SmsSession, dataDir: string): void {
  if (Date.now() - session.createdAt >= SMS_SESSION_TTL_MS) {
    clearSmsSession(dataDir);
    throw new Error(sessionProblemMessage("expired"));
  }
}

async function settleLogin(session: SmsSession, code: string, dataDir: string, fetchImpl: XueqiuFetch): Promise<SmsCommandResult> {
  assertFresh(session, dataDir);
  assertSendable(session);
  const outcome = await submitSmsLogin(session, code, fetchImpl);
  if (outcome.kind === "ok") {
    clearSmsSession(dataDir);
    return { status: "logged-in", cookie: outcome.cookie };
  }
  if (outcome.kind === "needs-browser" || outcome.kind === "error") {
    console.log(`SMS_ERROR=${safeServerMessage(outcome.message)}`);
    return { status: "rejected", reason: "incomplete" };
  }
  if (outcome.kind === "transport") {
    throw new Error("Xueqiu rejected the login request. The SMS session is still saved.");
  }
  console.log("SMS_CODE_REJECTED=1");
  console.log(`SMS_ERROR=${safeServerMessage(outcome.message)}`);
  return { status: "rejected", reason: "code" };
}

async function promptForCode(session: SmsSession, dataDir: string, secrets: string[]): Promise<SmsCommandResult> {
  let attempts = 0;
  while (attempts < SMS_CODE_ATTEMPTS) {
    const line = await readPromptLine(SMS_CODE_PROMPT);
    if (line === null) {
      console.log("  stdin closed. Finish with: snowball login --sms-code <code>");
      return { status: "pending" };
    }
    let code: string;
    try {
      code = normalizeSmsCode(line);
    } catch (error: any) {
      console.error(`  ${error?.message || "SMS code must be 4 to 8 digits"}`);
      continue;
    }
    secrets.push(code);
    attempts += 1;
    let settled: SmsCommandResult;
    try {
      settled = await settleLogin(session, code, dataDir, fetchXueqiu);
    } catch (error: any) {
      throw new Error(scrubSecrets(error?.message || "SMS login failed", secrets));
    }
    if (settled.status !== "rejected" || settled.reason !== "code") return settled;
    if (attempts >= SMS_CODE_ATTEMPTS) {
      console.error(`  The code was rejected ${SMS_CODE_ATTEMPTS} times. The session is still saved; run snowball login --sms-code <code> within 10 minutes.`);
      return settled;
    }
  }
  return { status: "rejected", reason: "code" };
}

function scrubbed<T>(secrets: string[], fn: () => Promise<T>): Promise<T> {
  return fn().catch((error: any) => {
    throw new Error(scrubSecrets(error?.message || "SMS login failed", secrets));
  });
}

/**
 * Send an SMS, then either prompt for the code or leave the session on disk.
 * Chrome is stopped before the code prompt.
 */
export async function runPhoneLogin(cdpUrl: string, options: PhoneLoginOptions): Promise<SmsCommandResult> {
  const secrets = [options.phone];
  return scrubbed(secrets, async () => {
    const driven = await driveUntilSmsSent({
      cdpUrl,
      phone: options.phone,
      areaCode: options.areaCode,
      timeoutMs: options.timeoutMs,
      dataDir: options.dataDir,
      chromePath: options.chromePath,
      interactiveClicks: options.interactive,
    });
    if (driven === "captcha-pending") return { status: "pending" };
    const loaded = loadSmsSession(options.dataDir);
    if (!loaded.ok || loaded.session.phase !== "sent") {
      throw new Error("The SMS was sent but the session file could not be read.");
    }
    console.log("SMS_SENT=1");
    console.log(`  SMS sent to ${phoneLogLabel(options.areaCode, options.phone)}.`);
    if (!options.interactive) {
      console.log("  Session saved. Finish with: snowball login --sms-code <code>");
      return { status: "pending" };
    }
    return promptForCode(loaded.session, options.dataDir, secrets);
  });
}

/** Apply coordinates to a fresh GeeTest widget, send the SMS, and exit. */
export async function runCaptchaClick(cdpUrl: string, options: CaptchaClickOptions): Promise<SmsCommandResult> {
  const points = parseCaptchaClicks(options.spec);
  const loaded = loadSmsSession(options.dataDir);
  if (!loaded.ok) throw new Error(sessionProblemMessage(loaded.reason));
  if (loaded.session.phase === "sent") {
    throw new Error("The SMS was already sent. Run snowball login --sms-code <code>.");
  }
  const session = loaded.session;
  const secrets = [session.phone];
  return scrubbed(secrets, async () => {
    const driven = await driveUntilSmsSent({
      cdpUrl,
      phone: session.phone,
      areaCode: session.areaCode,
      timeoutMs: options.timeoutMs,
      dataDir: options.dataDir,
      chromePath: options.chromePath,
      interactiveClicks: false,
      presetClicks: points,
    });
    if (driven === "captcha-pending") {
      throw new Error("GeeTest is still required. Run snowball login --captcha-click with coordinates from the new PNG.");
    }
    const sent = loadSmsSession(options.dataDir);
    if (!sent.ok || sent.session.phase !== "sent") {
      throw new Error("The SMS was sent but the session file could not be read.");
    }
    console.log("SMS_SENT=1");
    console.log(`  SMS sent to ${phoneLogLabel(sent.session.areaCode, sent.session.phone)}.`);
    console.log("  Session saved. Finish with: snowball login --sms-code <code>");
    return { status: "pending" };
  });
}

/** Finish a login from the session file. A wrong code leaves the file in place. */
export async function completeSavedLogin(
  dataDir: string,
  rawCode: string,
  fetchImpl: XueqiuFetch = fetchXueqiu,
): Promise<SmsCommandResult> {
  const code = normalizeSmsCode(rawCode);
  const loaded = loadSmsSession(dataDir);
  if (!loaded.ok) throw new Error(sessionProblemMessage(loaded.reason));
  if (loaded.session.phase !== "sent") throw new Error(captchaPhaseMessage());
  const secrets = [loaded.session.phone, code];
  try {
    return await settleLogin(loaded.session, code, dataDir, fetchImpl);
  } catch (error: any) {
    throw new Error(scrubSecrets(error?.message || "SMS login failed", secrets));
  }
}
