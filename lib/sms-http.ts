/**
 * Persisted phone-login session and the SM4 body for /snb/provider/login.
 *
 * Xueqiu's bundle calls sm4.encrypt(JSON.stringify(plain), defaultKey) with
 * no options. That build defaults to CBC, PKCS#7, and iv = the key.
 * sm-crypto@0.3 defaults to ECB, so the mode and iv are passed explicitly.
 * The login response `data` field decrypts with DEVICE_INFO.secret, not
 * the default key.
 */

import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { sm4 } from "sm-crypto";
import { secureDirectory, secureFile } from "./private";

/** Hex key hardcoded as sm4.defaultKey in the Xueqiu web bundle. */
export const XUEQIU_SM4_KEY = "0123456789abcdeffedcba9876543210";

export const SMS_SESSION_TTL_MS = 10 * 60 * 1000;
export const SMS_CODE_ATTEMPTS = 4;

export const SMS_CODE_PROMPT = "请输入短信验证码:";
export const CAPTCHA_CLICK_PROMPT = "请输入点击坐标 (x,y;x,y):";

export interface SmsLoginPaths {
  dir: string;
  session: string;
  captcha: string;
}

export function smsLoginPaths(dataDir: string): SmsLoginPaths {
  const dir = join(dataDir, "sms-login");
  return {
    dir,
    session: join(dir, "session.json"),
    captcha: join(dir, "captcha.png"),
  };
}

/** A terminal prompt is the primary path. No TTY, or --no-wait, saves and exits. */
export function shouldPromptForSms(isTTY: boolean | undefined, noWait: boolean): boolean {
  return Boolean(isTTY) && !noWait;
}

/**
 * Canada is option value "2" in the modal and is sent as +1.
 * Every other code is sent as entered.
 */
export function wireAreaCode(areaCode: string): string {
  return areaCode === "2" ? "1" : areaCode;
}

export interface SmsGeetestFields {
  geetest_challenge?: string;
  geetest_validate?: string;
  geetest_seccode?: string;
  sid?: string;
}

export interface SmsSession {
  version: 1;
  createdAt: number;
  phase: "captcha" | "sent";
  /** Area code as selected on the form. "2" is Canada; the login POST uses {@link wireAreaCode}. */
  areaCode: string;
  phone: string;
  maskedPhone: string;
  cookie: string;
  deviceId: string;
  deviceSecret: string;
  xqGeetest: string;
  geetest: SmsGeetestFields;
}

const GEETEST_KEYS = ["geetest_challenge", "geetest_validate", "geetest_seccode", "sid"] as const;

export function encryptXueqiu(plain: string, key: string = XUEQIU_SM4_KEY): string {
  return sm4.encrypt(plain, key, { mode: "cbc", padding: "pkcs#7", iv: key });
}

export function decryptXueqiu(hex: string, key: string = XUEQIU_SM4_KEY): string {
  return sm4.decrypt(hex, key, { mode: "cbc", padding: "pkcs#7", iv: key });
}

export function decryptDeviceInfo(cipher: string): { secret: string; deviceId: string } {
  let parsed: { secret?: unknown; device_id?: unknown };
  try {
    parsed = JSON.parse(decryptXueqiu(cipher, XUEQIU_SM4_KEY) || "{}");
  } catch {
    throw new Error("Xueqiu device info could not be read");
  }
  if (typeof parsed.secret !== "string" || !parsed.secret || typeof parsed.device_id !== "string" || !parsed.device_id) {
    throw new Error("Xueqiu device info is missing");
  }
  return { secret: parsed.secret, deviceId: parsed.device_id };
}

export function parseSendPost(raw: string): unknown {
  const text = raw.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Axios may leave a JSON content-type unset and still stringify.
  }
  if (!text.includes("=")) return null;
  const params = new URLSearchParams(text);
  const record: Record<string, string> = {};
  for (const [key, value] of params.entries()) record[key] = value;
  return Object.keys(record).length ? record : null;
}

export function geetestFromSendBody(body: unknown): { xqGeetest: string; geetest: SmsGeetestFields } {
  if (!body || typeof body !== "object") return { xqGeetest: "", geetest: {} };
  const record = body as Record<string, unknown>;
  const geetest: SmsGeetestFields = {};
  for (const key of GEETEST_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value) geetest[key] = value;
  }
  const xq = record.xq_geetest;
  return { xqGeetest: typeof xq === "string" ? xq : "", geetest };
}

/** Plain object the web client passes to sm4.encrypt before POST /snb/provider/login. */
export function buildLoginPlain(session: SmsSession, code: string, isRegister: boolean): Record<string, unknown> {
  const plain: Record<string, unknown> = {
    remember_me: true,
    xq_geetest: session.xqGeetest,
    areacode: wireAreaCode(session.areaCode),
    telephone: session.phone,
    code,
    secret: session.deviceSecret,
    ee2eDid: session.deviceId,
  };
  for (const [key, value] of Object.entries(session.geetest)) {
    if (!value) continue;
    if (key in plain) continue;
    plain[key] = value;
  }
  if (isRegister) plain.is_register = 1;
  return plain;
}

/**
 * The login POST is a JSON object. A form-urlencoded header with that same
 * JSON string is what some Axios builds send; a real form field is last.
 * application/json is first: Xueqiu classifies that body (a wrong phone
 * comes back as error_code 20060) and does not classify the urlencoded one.
 */
export function loginRequestBodies(encryptData: string): { contentType: string; body: string }[] {
  const json = JSON.stringify({ encryptData });
  return [
    { contentType: "application/json;charset=utf-8", body: json },
    { contentType: "application/x-www-form-urlencoded;charset=utf-8", body: json },
    { contentType: "application/x-www-form-urlencoded;charset=utf-8", body: `encryptData=${encodeURIComponent(encryptData)}` },
  ];
}

/** A decrypt/parse failure is a reason to try another body encoding. A wrong code is not. */
export function looksLikeBodyMismatch(message: string): boolean {
  return /decrypt|encrypt|padding|cipher|bad data|解密|加密|解析/i.test(message);
}

export function sessionProblemMessage(reason: "missing" | "expired" | "invalid"): string {
  switch (reason) {
    case "missing":
      return "No SMS login session. Run snowball login --phone <number> first.";
    case "expired":
      return "The SMS login session expired after 10 minutes. Run snowball login --phone again.";
    case "invalid":
      return "The SMS login session file is unreadable. Run snowball login --phone again.";
  }
}

export function captchaPhaseMessage(): string {
  return "The SMS has not been sent yet. Finish GeeTest with snowball login --captcha-click x,y";
}

function isSession(value: unknown): value is SmsSession {
  if (!value || typeof value !== "object") return false;
  const session = value as SmsSession;
  return session.version === 1
    && (session.phase === "captcha" || session.phase === "sent")
    && typeof session.createdAt === "number"
    && Number.isFinite(session.createdAt)
    && typeof session.areaCode === "string"
    && /^\d{1,4}$/.test(session.areaCode)
    && typeof session.phone === "string"
    && /^\d{6,14}$/.test(session.phone)
    && typeof session.maskedPhone === "string"
    && typeof session.cookie === "string"
    && typeof session.deviceId === "string"
    && typeof session.deviceSecret === "string"
    && typeof session.xqGeetest === "string"
    && !!session.geetest
    && typeof session.geetest === "object";
}

export function saveSmsSession(dataDir: string, session: SmsSession): void {
  const paths = smsLoginPaths(dataDir);
  secureDirectory(dataDir);
  secureDirectory(paths.dir);
  const tmp = `${paths.session}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(session), { encoding: "utf-8", mode: 0o600 });
  secureFile(tmp);
  renameSync(tmp, paths.session);
  secureFile(paths.session);
}

export type LoadedSession =
  | { ok: true; session: SmsSession }
  | { ok: false; reason: "missing" | "expired" | "invalid" };

export function loadSmsSession(dataDir: string, now = Date.now()): LoadedSession {
  const paths = smsLoginPaths(dataDir);
  if (!existsSync(paths.session)) return { ok: false, reason: "missing" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(paths.session, "utf-8"));
  } catch {
    rmSync(paths.session, { force: true });
    return { ok: false, reason: "invalid" };
  }
  if (!isSession(parsed)) {
    rmSync(paths.session, { force: true });
    return { ok: false, reason: "invalid" };
  }
  if (now - parsed.createdAt >= SMS_SESSION_TTL_MS) {
    clearSmsSession(dataDir);
    return { ok: false, reason: "expired" };
  }
  return { ok: true, session: parsed };
}

export function clearSmsSession(dataDir: string): void {
  const paths = smsLoginPaths(dataDir);
  rmSync(paths.session, { force: true });
  rmSync(paths.captcha, { force: true });
}
