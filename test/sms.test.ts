import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  classifyLoginBody,
  classifySendBody,
  geeTestRequiresChallenge,
  maskPhone,
  normalizeAreaCode,
  normalizePhone,
  normalizeSmsCode,
  PAGE_API,
  parseCaptchaClicks,
  phoneLogLabel,
  prepareSmsIpc,
  safeServerMessage,
  scrubSecrets,
  smsIpcPaths,
  takeCaptchaClicks,
  takeSmsCode,
  writeCaptchaClicks,
  writeSmsCode,
} from "../lib/sms";

describe("SMS phone and code", () => {
  test("area code defaults to 86 and accepts 45", () => {
    expect(normalizeAreaCode(undefined)).toBe("86");
    expect(normalizeAreaCode("+45")).toBe("45");
    expect(normalizeAreaCode(" 852 ")).toBe("852");
    expect(() => normalizeAreaCode("86a")).toThrow(/--area-code/);
    expect(() => normalizeAreaCode("0")).toThrow(/--area-code/);
  });

  test("+86 must be 11 digits and other codes are 6 to 14", () => {
    expect(normalizePhone("138-0013-8000", "86")).toBe("13800138000");
    expect(() => normalizePhone("1000000000", "86")).toThrow(/11 digits/);
    expect(normalizePhone("12345678", "45")).toBe("12345678");
    expect(() => normalizePhone("12345", "45")).toThrow(/6 to 14/);
    expect(() => normalizePhone("12ab", "86")).toThrow(/digits/);
  });

  test("mask hides the middle of the number", () => {
    expect(maskPhone("13800138000")).toBe("138****8000");
    expect(maskPhone("13800138000")).not.toContain("0013");
    expect(phoneLogLabel("45", "12345678")).toBe("+45 123****5678");
    expect(phoneLogLabel("86", "13800138000")).not.toContain("13800138000");
    expect(maskPhone("123456")).toBe("1****6");
  });

  test("SMS code is 4 to 8 digits and is scrubbed out of errors", () => {
    expect(normalizeSmsCode(" 123456 ")).toBe("123456");
    expect(() => normalizeSmsCode("12")).toThrow(/4 to 8/);
    expect(() => normalizeSmsCode("1234ab")).toThrow(/4 to 8/);
    expect(scrubSecrets("failed for 13800138000 code 123456", ["13800138000", "123456"])).toBe(
      "failed for ****** code ******",
    );
    expect(safeServerMessage("手机号 13800138000 不正确")).toBe("手机号 ****** 不正确");
    expect(safeServerMessage("验证码错误")).toBe("验证码错误");
  });

  test("captcha clicks are x,y pairs from the screenshot", () => {
    expect(parseCaptchaClicks("120,80")).toEqual([{ x: 120, y: 80 }]);
    expect(parseCaptchaClicks("10,20;30,40")).toEqual([{ x: 10, y: 20 }, { x: 30, y: 40 }]);
    expect(() => parseCaptchaClicks("12")).toThrow(/x,y/);
    expect(() => parseCaptchaClicks("-1,2")).toThrow(/x,y/);
  });
});

describe("SMS server responses", () => {
  test("send and GeeTest bodies", () => {
    expect(classifySendBody({ success: true })).toEqual({ ok: true });
    expect(classifySendBody({ success: 1 })).toEqual({ ok: true });
    expect(classifySendBody({ success: false, error_description: "发送太频繁" })).toEqual({
      ok: false,
      message: "发送太频繁",
    });
    expect(geeTestRequiresChallenge({ available: 0, success: 0 })).toBe(false);
    expect(geeTestRequiresChallenge({ available: 1, gt: "x", challenge: "y" })).toBe(true);
    expect(geeTestRequiresChallenge({ success: false })).toBe(null);
  });

  test("login 20099 is the auto-register signal and other codes can be retried", () => {
    expect(classifyLoginBody({ error_code: 0, data: "ciphertext" })).toEqual({ kind: "ok" });
    expect(classifyLoginBody({ error_code: "20099", error_description: "未注册" })).toEqual({ kind: "register" });
    expect(classifyLoginBody({ error_code: 20094, error_description: "请输入图形验证码" })).toEqual({
      kind: "image-captcha",
      message: "请输入图形验证码",
    });
    const rejected = classifyLoginBody({ error_code: 20020, error_description: "验证码错误" });
    expect(rejected).toEqual({ kind: "reject", message: "验证码错误" });
    expect(classifyLoginBody({ error_code: 21701, error_description: "验证码 123456 已过期" })?.kind).toBe("reject");
    if (classifyLoginBody({ error_code: 21701, error_description: "验证码 123456 已过期" })?.kind === "reject") {
      expect(classifyLoginBody({ error_code: 21701, error_description: "验证码 123456 已过期" })).toEqual({
        kind: "reject",
        message: "验证码 ****** 已过期",
      });
    }
  });
});

describe("SMS code file", () => {
  test("a separate process can leave a 0600 code file, and clicks are consumed once", () => {
    const dir = mkdtempSync(join(tmpdir(), "snowball-sms-"));
    try {
      prepareSmsIpc(dir);
      writeSmsCode(dir, "654321");
      const codeFile = smsIpcPaths(dir).code;
      if (process.platform !== "win32") {
        expect(statSync(smsIpcPaths(dir).dir).mode & 0o777).toBe(0o700);
        expect(statSync(codeFile).mode & 0o777).toBe(0o600);
      }
      expect(readFileSync(codeFile, "utf-8").trim()).toBe("654321");
      expect(takeSmsCode(dir)).toBe("654321");
      expect(takeSmsCode(dir)).toBe(null);

      chmodSync(smsIpcPaths(dir).clicksDir, 0o755);
      expect(writeCaptchaClicks(dir, "12,34;56,78")).toBe(2);
      if (process.platform !== "win32") {
        expect(statSync(smsIpcPaths(dir).clicksDir).mode & 0o777).toBe(0o700);
      }
      expect(takeCaptchaClicks(dir)).toEqual([{ x: 12, y: 34 }, { x: 56, y: 78 }]);
      expect(takeCaptchaClicks(dir)).toEqual([]);

      writeSmsCode(dir, "111111");
      prepareSmsIpc(dir);
      expect(takeSmsCode(dir)).toBe(null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the in-page helper is valid JavaScript", () => {
    new Function(PAGE_API);
    expect(PAGE_API).toContain("发送验证码");
    expect(PAGE_API).toContain("modal__login__main");
  });
});
