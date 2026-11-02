import { describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  clearStaleChromeLocks,
  debugPort,
  planChromeLaunch,
} from "../lib/browser";
import {
  cookiePairsFromSetCookie,
  fetchXueqiu,
  hasLoginCookie,
  interpretQRState,
  mergeCookies,
  qrGenerateUrl,
  qrPollUrl,
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

  test("replayed redirects keep the Cookie header", async () => {
    let port = 0;
    const server = Bun.serve({
      port: 0,
      fetch(req): Response {
        const url = new URL(req.url);
        if (url.pathname === "/apex") {
          return new Response("moved", {
            status: 301,
            headers: { Location: `http://127.0.0.1:${port}/www${url.search}` },
          });
        }
        return Response.json({
          cookie: req.headers.get("cookie"),
          path: url.pathname,
        });
      },
    });
    port = server.port ?? 0;

    try {
      const { response, cookie } = await fetchXueqiu(
        `http://127.0.0.1:${server.port}/apex?code=abc`,
        "device_id=dev; xq_a_token=guest",
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.path).toBe("/www");
      expect(body.cookie).toBe("device_id=dev; xq_a_token=guest");
      expect(cookie).toContain("device_id=dev");
    } finally {
      server.stop(true);
    }
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
