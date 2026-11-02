import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  SMS_CODE_PROMPT,
  CAPTCHA_CLICK_PROMPT,
  captchaPhaseMessage,
  classifyLoginBody,
  classifySendBody,
  completeSavedLogin,
  geeTestRequiresChallenge,
  maskPhone,
  normalizeAreaCode,
  normalizePhone,
  normalizeSmsCode,
  PAGE_API,
  parseCaptchaClicks,
  phoneLogLabel,
  safeServerMessage,
  scrubSecrets,
  sessionProblemMessage,
  shouldPromptForSms,
  submitSmsLogin,
} from "../lib/sms";
import {
  SMS_SESSION_TTL_MS,
  buildLoginPlain,
  clearSmsSession,
  decryptXueqiu,
  encryptXueqiu,
  geetestFromSendBody,
  loadSmsSession,
  loginRequestBodies,
  looksLikeBodyMismatch,
  parseSendPost,
  saveSmsSession,
  smsLoginPaths,
  wireAreaCode,
  type SmsSession,
} from "../lib/sms-http";

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

function sampleSession(overrides: Partial<SmsSession> = {}): SmsSession {
  return {
    version: 1,
    createdAt: Date.now(),
    phase: "sent",
    areaCode: "86",
    phone: "13800138000",
    maskedPhone: "138****8000",
    cookie: "device_id=abc; xq_a_token=guest",
    deviceId: "did-1",
    deviceSecret: "0123456789abcdeffedcba9876543210",
    xqGeetest: "geetest-token",
    geetest: { sid: "abc" },
    ...overrides,
  };
}

describe("SMS session file", () => {
  test("a saved session is mode 0600 and survives until success", async () => {
    const dir = mkdtempSync(join(tmpdir(), "snowball-sms-"));
    const logs: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    try {
      const session = sampleSession();
      saveSmsSession(dir, session);
      const file = smsLoginPaths(dir).session;
      if (process.platform !== "win32") {
        expect(statSync(smsLoginPaths(dir).dir).mode & 0o777).toBe(0o700);
        expect(statSync(file).mode & 0o777).toBe(0o600);
      }
      const loaded = loadSmsSession(dir);
      expect(loaded.ok).toBe(true);
      if (loaded.ok) expect(loaded.session.phone).toBe("13800138000");

      const rejected = await completeSavedLogin(dir, "000000", async () => ({
        response: Response.json({ error_code: 21701, error_description: "验证码错误" }),
        cookie: session.cookie,
      }));
      expect(rejected.status).toBe("rejected");
      expect(loadSmsSession(dir).ok).toBe(true);
      expect(logs.some((line) => line.startsWith("SMS_CODE_REJECTED=1"))).toBe(true);
      expect(logs.join("\n")).not.toContain("13800138000");
      expect(logs.join("\n")).not.toContain("000000");

      const loggedIn = "xq_a_token=tok; u=42; xq_is_login=1";
      const ok = await completeSavedLogin(dir, "000000", async () => ({
        response: Response.json({ error_code: 0 }),
        cookie: loggedIn,
      }));
      expect(ok).toEqual({ status: "logged-in", cookie: loggedIn });
      expect(loadSmsSession(dir).ok).toBe(false);
    } finally {
      console.log = original;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("an expired session is removed and a captcha session cannot take a code", () => {
    const dir = mkdtempSync(join(tmpdir(), "snowball-sms-"));
    try {
      saveSmsSession(dir, sampleSession({ createdAt: Date.now() - SMS_SESSION_TTL_MS - 1 }));
      const expired = loadSmsSession(dir);
      expect(expired).toEqual({ ok: false, reason: "expired" });
      expect(sessionProblemMessage("expired")).toContain("10 minutes");
      expect(loadSmsSession(dir).ok).toBe(false);

      saveSmsSession(dir, sampleSession({ phase: "captcha" }));
      expect(loadSmsSession(dir).ok).toBe(true);
      expect(captchaPhaseMessage()).toContain("--captcha-click");
      clearSmsSession(dir);
      expect(loadSmsSession(dir)).toEqual({ ok: false, reason: "missing" });
      expect(sessionProblemMessage("missing")).toContain("--phone");
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

describe("SMS login body", () => {
  test("Canada is sent as +1 and 20099 retries with is_register", async () => {
    expect(wireAreaCode("2")).toBe("1");
    expect(wireAreaCode("45")).toBe("45");
    expect(shouldPromptForSms(true, false)).toBe(true);
    expect(shouldPromptForSms(true, true)).toBe(false);
    expect(shouldPromptForSms(false, false)).toBe(false);
    expect(SMS_CODE_PROMPT).toBe("请输入短信验证码:");
    expect(CAPTCHA_CLICK_PROMPT).toBe("请输入点击坐标 (x,y;x,y):");

    const session = sampleSession({
      areaCode: "2",
      phone: "12345678",
      geetest: { geetest_challenge: "chal", sid: "sid-1" },
    });
    const plain = buildLoginPlain(session, "1234", false);
    expect(plain.areacode).toBe("1");
    expect(plain.telephone).toBe("12345678");
    expect(plain.is_register).toBeUndefined();
    expect(plain.geetest_challenge).toBe("chal");
    expect(buildLoginPlain(session, "1234", true).is_register).toBe(1);

    const hex = encryptXueqiu(JSON.stringify(plain));
    expect(hex).toMatch(/^[0-9a-f]+$/);
    expect(JSON.parse(decryptXueqiu(hex))).toEqual(plain);
    expect(loginRequestBodies(hex)[0].contentType).toContain("application/json");
    expect(loginRequestBodies(hex)[0].body).toContain(hex);
    expect(looksLikeBodyMismatch("验证码错误")).toBe(false);
    expect(looksLikeBodyMismatch("decrypt error")).toBe(true);

    const parsed = parseSendPost(JSON.stringify({
      areacode: "86",
      telephone: "13800138000",
      xq_geetest: "xq",
      geetest_challenge: "chal",
      sid: "sid-1",
    }));
    expect(geetestFromSendBody(parsed)).toEqual({
      xqGeetest: "xq",
      geetest: { geetest_challenge: "chal", sid: "sid-1" },
    });

    const bodies: string[] = [];
    const result = await submitSmsLogin(session, "1234", async (_url, cookie, init) => {
      bodies.push(String(init?.body ?? ""));
      if (bodies.length === 1) {
        return {
          response: Response.json({ error_code: 20099, error_description: "未注册" }),
          cookie: `${cookie}; xq_a_token=guest`,
        };
      }
      return {
        response: Response.json({ error_code: 0 }),
        cookie: "xq_a_token=tok; u=7; xq_is_login=1",
      };
    });
    expect(result).toEqual({ kind: "ok", cookie: "xq_a_token=tok; u=7; xq_is_login=1" });
    expect(bodies.length).toBe(2);
    const second = JSON.parse(decryptXueqiu(JSON.parse(bodies[1]).encryptData));
    expect(second.is_register).toBe(1);
    expect(second.code).toBe("1234");
    expect(second.areacode).toBe("1");
  });

  test("a non-JSON login response tries the next encoding", async () => {
    const types: string[] = [];
    const result = await submitSmsLogin(sampleSession(), "1234", async (_url, _cookie, init) => {
      const headers = new Headers(init?.headers);
      types.push(headers.get("content-type") || "");
      if (types.length === 1) return { response: new Response("blocked", { status: 400 }), cookie: "device_id=abc" };
      return {
        response: Response.json({ error_code: 21701, error_description: "验证码错误" }),
        cookie: "device_id=abc",
      };
    });
    expect(types[0]).toContain("application/json");
    expect(types[1]).toContain("application/x-www-form-urlencoded");
    expect(result).toEqual({ kind: "reject", message: "验证码错误" });
  });
});

describe("login help", () => {
  test("login --help and -h do not start Chrome", async () => {
    const root = join(import.meta.dir, "..");
    for (const args of [["login", "--help"], ["login", "-h"], ["login", "--phone", "--help"]]) {
      const proc = Bun.spawn(["bun", "index.ts", ...args], {
        cwd: root,
        stdout: "pipe",
        stderr: "pipe",
        stdin: "ignore",
      });
      const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      const text = stdout + stderr;
      expect(code).toBe(0);
      expect(text).toContain("请输入短信验证码:");
      expect(text).toContain("--sms-code");
      expect(text).not.toContain("Starting Chrome");
      expect(text).not.toContain("Opening xueqiu");
    }
  });

  test("a short +86 number fails before Chrome starts", async () => {
    const proc = Bun.spawn(["bun", "index.ts", "login", "--phone", "12345"], {
      cwd: join(import.meta.dir, ".."),
      stdout: "pipe",
      stderr: "pipe",
      stdin: "ignore",
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(code).toBe(1);
    expect(stdout + stderr).toContain("11 digits");
    expect(stdout + stderr).not.toContain("Starting Chrome");
  });
});
