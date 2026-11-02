import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  clearStaleChromeLocks,
  debugPort,
  planChromeLaunch,
  xvfbArgs,
} from "../lib/browser";
import { secureDirectory, secureFile } from "../lib/private";
import {
  assertXueqiuRedirect,
  cookiePairsFromSetCookie,
  DEFAULT_LOGIN_TIMEOUT_MS,
  fetchXueqiu,
  hasLoginCookie,
  interpretQRState,
  isXueqiuHostname,
  mergeCookies,
  parseLoginTimeoutMs,
  qrGenerateUrl,
  qrPollUrl,
  shouldRefreshQr,
  writeQRPng,
} from "../lib/qr-terminal";

describe("QR API host", () => {
  test("poll and generate use www.xueqiu.com so Cookie survives", () => {
    expect(qrGenerateUrl()).toBe("https://www.xueqiu.com/snb/provider/generate-qr-code");
    expect(qrPollUrl("abc123")).toBe(
      "https://www.xueqiu.com/snb/provider/query-qr-code-state?code=abc123",
    );
    expect(qrPollUrl("abc")).not.toContain("https://xueqiu.com/snb");
  });

  test("Set-Cookie from the response is merged into the jar", async () => {
    const server = Bun.serve({
      port: 0,
      fetch(): Response {
        return new Response(JSON.stringify({ ok: true }), {
          headers: [
            ["content-type", "application/json"],
            ["set-cookie", "xq_a_token=real; Path=/; HttpOnly"],
            ["set-cookie", "xq_is_login=1; Path=/"],
            ["set-cookie", "u=42; Path=/"],
          ],
        });
      },
    });
    try {
      const { cookie } = await fetchXueqiu(
        `http://127.0.0.1:${server.port}/ok`,
        "device_id=dev; xq_a_token=guest",
      );
      expect(hasLoginCookie(cookie)).toBe(true);
      expect(cookie).toContain("device_id=dev");
      expect(cookie).toContain("xq_a_token=real");
    } finally {
      server.stop(true);
    }
  });

  test("isXueqiuHostname is the registrable domain and its subdomains", () => {
    expect(isXueqiuHostname("xueqiu.com")).toBe(true);
    expect(isXueqiuHostname("www.xueqiu.com")).toBe(true);
    expect(isXueqiuHostname("stock.xueqiu.com")).toBe(true);
    expect(isXueqiuHostname("WWW.XUEQIU.COM.")).toBe(true);
    expect(isXueqiuHostname("xueqiu.com.evil.com")).toBe(false);
    expect(isXueqiuHostname("notxueqiu.com")).toBe(false);
    expect(isXueqiuHostname("evil.com")).toBe(false);
    expect(isXueqiuHostname("127.0.0.1")).toBe(false);
  });

  test("cookie-bearing redirects may stay on https xueqiu and nowhere else", () => {
    const apex = "https://xueqiu.com/snb/provider/query-qr-code-state?code=abc";
    expect(assertXueqiuRedirect(apex, "https://www.xueqiu.com/snb/provider/query-qr-code-state?code=abc"))
      .toBe("https://www.xueqiu.com/snb/provider/query-qr-code-state?code=abc");
    expect(() => assertXueqiuRedirect("https://www.xueqiu.com/a", "https://evil.example/steal")).toThrow(/evil\.example/);
    expect(() => assertXueqiuRedirect("https://www.xueqiu.com/a", "http://www.xueqiu.com/a")).toThrow(/http:/);
    expect(() => assertXueqiuRedirect("https://www.xueqiu.com/a", "https://xueqiu.com.evil.com/a")).toThrow(/xueqiu\.com\.evil\.com/);
    let leaked = "";
    try {
      assertXueqiuRedirect(
        "https://www.xueqiu.com/a",
        "https://evil.example/steal?access_token=secret-token&u=12345&session_token=sess-value&uuid=abc-uuid",
      );
    } catch (err) {
      leaked = err instanceof Error ? err.message : String(err);
    }
    expect(leaked).toMatch(/evil\.example/);
    expect(leaked.includes("secret-token")).toBe(false);
    expect(leaked.includes("12345")).toBe(false);
    expect(leaked.includes("sess-value")).toBe(false);
    expect(leaked.includes("abc-uuid")).toBe(false);
    expect(leaked.includes("access_token")).toBe(false);
    try {
      assertXueqiuRedirect("https://www.xueqiu.com/a", "http://[/?access_token=secret-token&u=12345");
    } catch (err) {
      leaked = err instanceof Error ? err.message : String(err);
    }
    expect(leaked.includes("secret-token")).toBe(false);
    expect(leaked.includes("12345")).toBe(false);
  });

  test("does not follow a redirect off xueqiu.com or send the cookie there", async () => {
    let leaked: string | null = null;
    let hits = 0;
    const evil = Bun.serve({
      port: 0,
      fetch(req) {
        hits++;
        leaked = req.headers.get("cookie");
        return new Response("nope");
      },
    });
    const server = Bun.serve({
      port: 0,
      fetch() {
        return new Response("moved", {
          status: 302,
          headers: { Location: `http://127.0.0.1:${evil.port}/steal` },
        });
      },
    });
    try {
      await expect(fetchXueqiu(
        `http://127.0.0.1:${server.port}/qr`,
        "xq_a_token=secret",
      )).rejects.toThrow(/127\.0\.0\.1/);
      expect(hits).toBe(0);
      expect(leaked).toBeNull();
    } finally {
      server.stop(true);
      evil.stop(true);
    }
  });
});

describe("login wait", () => {
  test("default timeout is 10 minutes and --timeout is seconds", () => {
    expect(DEFAULT_LOGIN_TIMEOUT_MS).toBe(600_000);
    expect(parseLoginTimeoutMs(undefined)).toBe(600_000);
    expect(parseLoginTimeoutMs("90")).toBe(90_000);
    expect(parseLoginTimeoutMs("0.5")).toBe(500);
    expect(() => parseLoginTimeoutMs("0")).toThrow(/--timeout/);
    expect(() => parseLoginTimeoutMs("-1")).toThrow(/--timeout/);
    expect(() => parseLoginTimeoutMs("10m")).toThrow(/--timeout/);
  });

  test("a local poll timeout refreshes the QR the same way an expiry does", () => {
    expect(shouldRefreshQr("EXPIRED")).toBe(true);
    expect(shouldRefreshQr("TIMEOUT")).toBe(true);
    expect(shouldRefreshQr("xq_a_token=a; u=1; xq_is_login=1")).toBe(false);
  });
});

describe("QR status codes (xueqiu web bundle)", () => {
  test("0 is waiting, 1 is scanned, 2 confirms only when the phone is bound", () => {
    expect(interpretQRState({ data: { status: 0 } }).type).toBe("pending");
    expect(interpretQRState({ data: { status: 1 } }).type).toBe("scanned");
    expect(interpretQRState({ data: { status: 2, is_bind_tel: true } }).type).toBe("confirmed");
    expect(interpretQRState({ data: { status: 2, is_bind_tel: false } }).type).toBe("bindphone");
    expect(interpretQRState({ data: { status: 3 } }).type).toBe("cancelled");
    expect(interpretQRState({ data: { status: 4 } }).type).toBe("expired");
    expect(interpretQRState({ data: { status: 5 } }).type).toBe("login");
  });
});

describe("login cookies", () => {
  test("guest xq_a_token is not a finished login", () => {
    const guest = "xq_a_token=guest; u=191793634116514; device_id=abc; cookiesu=191793634116514";
    expect(hasLoginCookie(guest)).toBe(false);
  });

  test("xq_is_login plus u and xq_a_token is a finished login", () => {
    const loggedIn = "xq_a_token=real; u=12345; xq_is_login=1; device_id=abc";
    expect(hasLoginCookie(loggedIn)).toBe(true);
  });

  test("mergeCookies lets later values win", () => {
    expect(mergeCookies("a=1; b=2", "b=3; c=4")).toBe("a=1; b=3; c=4");
  });

  test("set-cookie pairs drop attributes", () => {
    expect(cookiePairsFromSetCookie([
      "xq_a_token=abc; Path=/; Domain=.xueqiu.com; HttpOnly",
      "xq_is_login=1; Path=/",
    ])).toBe("xq_a_token=abc; xq_is_login=1");
  });
});

describe("private files", () => {
  test("existing directories become 0700 and secret files 0600", () => {
    if (process.platform === "win32") return;
    const dir = join(tmpdir(), `snowball-mode-${process.pid}`);
    const file = join(dir, "token.json");
    mkdirSync(dir, { recursive: true, mode: 0o755 });
    writeFileSync(file, "secret", { mode: 0o644 });
    chmodSync(dir, 0o755);
    secureDirectory(dir);
    secureFile(file);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("Chrome launch plan", () => {
  const profile = "/tmp/snowball-profile";

  test("Linux with a display is headed and disables the sandbox", () => {
    const plan = planChromeLaunch({
      platform: "linux",
      hasDisplay: true,
      xvfbAvailable: true,
      profileDir: profile,
      port: 9222,
    });
    expect(plan.mode).toBe("headed");
    expect(plan.headless).toBe(false);
    expect(plan.args).toContain("--no-sandbox");
    expect(plan.args).toContain("--disable-dev-shm-usage");
    expect(plan.args.some((arg) => arg.startsWith("--headless"))).toBe(false);
    expect(plan.args).toContain("--remote-debugging-port=9222");
  });

  test("Linux without a display prefers Xvfb over headless", () => {
    const plan = planChromeLaunch({
      platform: "linux",
      hasDisplay: false,
      xvfbAvailable: true,
      profileDir: profile,
      port: 9333,
    });
    expect(plan.mode).toBe("xvfb");
    expect(plan.headless).toBe(false);
    expect(plan.args).toContain("--no-sandbox");
    expect(plan.args).toContain("--disable-gpu");
    expect(plan.args.some((arg) => arg.startsWith("--headless"))).toBe(false);
    expect(plan.args).toContain("--remote-debugging-port=9333");
  });

  test("Linux without a display or Xvfb falls back to headless", () => {
    const plan = planChromeLaunch({
      platform: "linux",
      hasDisplay: false,
      xvfbAvailable: false,
      profileDir: profile,
      port: 9222,
    });
    expect(plan.mode).toBe("headless");
    expect(plan.args).toContain("--headless=new");
    expect(plan.args).toContain("--no-sandbox");
  });

  test("macOS does not force --no-sandbox", () => {
    const plan = planChromeLaunch({
      platform: "darwin",
      hasDisplay: true,
      xvfbAvailable: false,
      profileDir: profile,
      port: 9222,
    });
    expect(plan.mode).toBe("headed");
    expect(plan.args).not.toContain("--no-sandbox");
  });

  test("Xvfb does not disable access control", () => {
    const args = xvfbArgs(":99", "/tmp/snowball.xauth");
    expect(args).not.toContain("-ac");
    expect(args).toContain("-auth");
    expect(args).toContain("/tmp/snowball.xauth");
    expect(args).toContain("-nolisten");
    expect(args).toContain("tcp");
  });

  test("debug port comes from the CDP url", () => {
    expect(debugPort("http://127.0.0.1:9333")).toBe(9333);
    expect(debugPort("http://127.0.0.1:9222")).toBe(9222);
  });

  test("stale Singleton locks are removed, including symlinks", () => {
    const dir = join(tmpdir(), `snowball-locks-${process.pid}`);
    mkdirSync(dir, { recursive: true });
    const target = join(dir, "lock-target");
    writeFileSync(target, "x");
    if (process.platform === "win32") {
      writeFileSync(join(dir, "SingletonLock"), "l");
    } else {
      symlinkSync(target, join(dir, "SingletonLock"));
    }
    writeFileSync(join(dir, "SingletonCookie"), "c");
    writeFileSync(join(dir, "SingletonSocket"), "s");
    clearStaleChromeLocks(dir);
    expect(() => readFileSync(join(dir, "SingletonLock"))).toThrow();
    expect(() => readFileSync(join(dir, "SingletonCookie"))).toThrow();
    expect(() => readFileSync(join(dir, "SingletonSocket"))).toThrow();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("QR png", () => {
  test("writes a PNG file and returns the absolute path", async () => {
    const file = join(tmpdir(), `snowball-qr-${process.pid}`, "nested", "code.png");
    const written = await writeQRPng("https://xueqiu.com/third_party_app_scan_code?src=0&code=abc", file);
    const bytes = readFileSync(written);
    expect(written).toBe(file);
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    rmSync(join(tmpdir(), `snowball-qr-${process.pid}`), { recursive: true, force: true });
  });
});

describe("Bun is the runtime", () => {
  test("the published bin is a Bun shebang", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(pkg.bin.snowball).toBe("dist/index.js");
    expect(pkg.engines.bun).toBeTruthy();
    expect(pkg.scripts.build).toContain("--target bun");
    expect(pkg.scripts.build).not.toContain("--target node");
    const shebang = readFileSync(new URL("../dist/index.js", import.meta.url), "utf8").split("\n")[0];
    expect(shebang).toBe("#!/usr/bin/env bun");
    expect(readFileSync(new URL("../cli.js", import.meta.url), "utf8").startsWith("#!/usr/bin/env bun")).toBe(true);
  });
});
