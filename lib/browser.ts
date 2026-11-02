/**
 * Chrome / Chromium launch for Xueqiu login.
 *
 * Linux notes (observed on a server box):
 *   - Headed Chrome often refuses to start until --no-sandbox is set, and a
 *     previous crash leaves Singleton* locks in the profile directory.
 *   - Headless Chrome is identified as HeadlessChrome and Xueqiu's Aliyun WAF
 *     blocks it (no device_id / xq_a_token). A real headed Chrome on Xvfb
 *     gets those cookies, so a missing DISPLAY uses Xvfb instead of headless.
 */

import { execFileSync, spawn } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import { homedir, platform } from "os";
import { join } from "path";

export const CHROME_PROFILE_DIR = join(homedir(), ".snowball-cli", "chrome-profile");

/** Files Chrome leaves behind that block the next launch after a crash. */
export const CHROME_SINGLETON_FILES = ["SingletonLock", "SingletonCookie", "SingletonSocket"];

const LINUX_SANDBOX_ARGS = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];

export interface LaunchContext {
  platform: string;
  /** DISPLAY or WAYLAND_DISPLAY is set. */
  hasDisplay: boolean;
  /** Xvfb is on PATH (only consulted when there is no display). */
  xvfbAvailable: boolean;
  profileDir: string;
  port: number;
}

export interface LaunchPlan {
  args: string[];
  headless: boolean;
  /** headed = real display, xvfb = virtual display, headless = last resort. */
  mode: "headed" | "xvfb" | "headless";
}

/** Pure description of how Chrome should be started. */
export function planChromeLaunch(ctx: LaunchContext): LaunchPlan {
  const args = [
    `--remote-debugging-port=${ctx.port}`,
    `--user-data-dir=${ctx.profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
  ];

  if (ctx.platform === "linux") args.push(...LINUX_SANDBOX_ARGS);

  if (ctx.platform === "linux" && !ctx.hasDisplay) {
    if (ctx.xvfbAvailable) {
      args.push("--disable-gpu");
      return { args, headless: false, mode: "xvfb" };
    }
    args.push("--headless=new", "--disable-gpu");
    return { args, headless: true, mode: "headless" };
  }

  return { args, headless: false, mode: "headed" };
}

export function clearStaleChromeLocks(profileDir: string): void {
  for (const name of CHROME_SINGLETON_FILES) {
    rmSync(join(profileDir, name), { force: true });
  }
}

export function debugPort(cdpUrl: string): number {
  try {
    const port = new URL(cdpUrl).port;
    return port ? Number(port) : 9222;
  } catch {
    return 9222;
  }
}

export function commandExists(name: string): boolean {
  const found = Bun.which(name);
  return Boolean(found);
}

function chromeCandidates(): string[] {
  const os = platform();
  const defaults: Record<string, string[]> = {
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ],
    win32: [
      join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
      join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
      join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
      join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Chromium", "Application", "chrome.exe"),
      join(process.env.LOCALAPPDATA ?? "", "Chromium", "Application", "chrome.exe"),
    ],
    linux: [
      "google-chrome",
      "google-chrome-stable",
      "chromium-browser",
      "chromium",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium",
    ],
  };
  return defaults[os] ?? defaults.linux;
}

export function findChrome(explicit?: string): string {
  if (explicit) return explicit;

  for (const candidate of chromeCandidates()) {
    if (candidate.includes("/") || candidate.includes("\\")) {
      if (existsSync(candidate)) return candidate;
    } else if (commandExists(candidate)) {
      return candidate;
    }
  }

  console.error("\n  Chrome / Chromium not found.\n");
  if (platform() === "linux") {
    console.error("  Install Chromium:\n");
    console.error("    apt install -y chromium-browser   # Debian/Ubuntu");
    console.error("    yum install -y chromium           # CentOS/RHEL");
    console.error("    snap install chromium             # Snap\n");
    console.error("  On a server without a display, also install Xvfb (headless Chrome cannot pass Xueqiu's WAF):\n");
    console.error("    apt install -y xvfb\n");
  } else if (platform() === "win32") {
    console.error("  Set CHROME_PATH:\n");
    console.error('    set CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"\n');
  } else {
    console.error("  Install Chrome or Chromium, or set CHROME_PATH:\n");
    console.error("    export CHROME_PATH=/path/to/chrome\n");
  }
  console.error("  Or use --chrome flag:  snowball login --chrome /path/to/chrome");
  console.error("  Or skip the browser:   snowball import $(snowball export)  # from another machine\n");
  throw new Error("Chrome / Chromium not found");
}

/** Best-effort: our profile's Chrome is ours, and CDP is already down. */
function stopProfileChrome(profileDir: string): void {
  if (platform() === "win32") return;
  const pattern = `--user-data-dir=${profileDir}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    execFileSync("pkill", ["-f", pattern], { stdio: "ignore" });
  } catch {
    // pkill exits 1 when nothing matched, and may be absent.
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cdpReady(cdpUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${cdpUrl}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Start Xvfb on a free display. The process is detached so it outlives the
 * login command (Chrome keeps using it). Returns the DISPLAY value, e.g. ":99".
 */
export async function startXvfb(): Promise<string | null> {
  if (!commandExists("Xvfb")) return null;

  for (let n = 99; n <= 109; n++) {
    const display = `:${n}`;
    const sock = `/tmp/.X11-unix/X${n}`;
    if (existsSync(sock)) continue;

    const child = spawn(
      "Xvfb",
      [display, "-screen", "0", "1280x800x24", "-ac", "-nolisten", "tcp"],
      { stdio: "ignore", detached: true },
    );
    child.unref();

    for (let i = 0; i < 20; i++) {
      if (existsSync(sock)) return display;
      await sleep(100);
    }
  }
  return null;
}

function spawnChrome(bin: string, args: string[], display?: string): { stderr: () => string } {
  const env = { ...process.env };
  if (display) env.DISPLAY = display;
  let stderrText = "";
  const child = spawn(bin, args, {
    stdio: ["ignore", "ignore", "pipe"],
    detached: true,
    env,
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    stderrText = (stderrText + chunk.toString("utf8")).slice(-2000);
  });
  // A piped stderr handle would keep the CLI from exiting after login.
  (child.stderr as { unref?: () => void } | null)?.unref?.();
  child.unref();
  return { stderr: () => stderrText };
}

/**
 * Ensure Chrome is listening on cdpUrl.
 * Reuses an existing debug port. Otherwise launches Chrome with a dedicated profile.
 */
export async function ensureChrome(cdpUrl: string, chromePath?: string): Promise<void> {
  if (await cdpReady(cdpUrl)) return;

  const profileDir = CHROME_PROFILE_DIR;
  mkdirSync(profileDir, { recursive: true });

  const bin = findChrome(chromePath);
  const hasDisplay = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  const xvfbAvailable = platform() === "linux" && !hasDisplay && commandExists("Xvfb");
  const plan = planChromeLaunch({
    platform: platform(),
    hasDisplay,
    xvfbAvailable,
    profileDir,
    port: debugPort(cdpUrl),
  });

  let display: string | undefined;
  if (plan.mode === "xvfb") {
    display = (await startXvfb()) ?? undefined;
    if (!display) {
      plan.args.push("--headless=new");
      plan.headless = true;
      plan.mode = "headless";
    }
  }

  if (plan.mode === "headless") {
    console.log("  No DISPLAY and Xvfb is not available — starting headless Chrome.");
    console.log("  Xueqiu's WAF blocks headless Chrome, so login will probably fail.");
    console.log("  Install Xvfb (`apt install -y xvfb`) or import a token from another machine.\n");
  } else if (plan.mode === "xvfb") {
    console.log(`  Starting Chrome on virtual display ${display} (Xvfb).`);
    console.log("  Headless Chrome cannot get Xueqiu WAF cookies; this is a real browser window.\n");
  } else {
    console.log("  Starting Chrome...");
  }

  // CDP is down, so nothing healthy is serving this profile. Drop crash locks
  // and any wedged Chrome, then try twice (a stale Singleton* lock often survives the first exit).
  let lastStderr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    stopProfileChrome(profileDir);
    await sleep(attempt === 1 ? 200 : 500);
    clearStaleChromeLocks(profileDir);

    const child = spawnChrome(bin, plan.args, display);
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      if (await cdpReady(cdpUrl)) return;
    }
    lastStderr = child.stderr();
  }

  const tail = lastStderr.trim() ? `\n${lastStderr.trim()}\n` : "";
  throw new Error(
    `Chrome failed to start.${tail}` +
      "On Linux the launcher adds --no-sandbox and deletes Singleton* locks in " +
      "~/.snowball-cli/chrome-profile before each attempt. " +
      "Set CHROME_PATH / --chrome if the detected binary is wrong.",
  );
}

const XUEQIU_HOME = "https://www.xueqiu.com/";

/** Open the Xueqiu home page in a new tab (WAF cookies are issued there). */
export async function openXueqiuTab(cdpUrl: string): Promise<void> {
  const version = await (await fetch(`${cdpUrl}/json/version`)).json();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("timeout"));
    }, 10000);
    ws.onopen = () =>
      ws.send(JSON.stringify({
        id: 1,
        method: "Target.createTarget",
        params: { url: XUEQIU_HOME },
      }));
    ws.onmessage = (event) => {
      const msg = JSON.parse(typeof event.data === "string" ? event.data : "");
      if (msg.id === 1) {
        clearTimeout(timer);
        ws.close();
        if (msg.error) reject(new Error(msg.error.message || "CDP failed"));
        else resolve();
      }
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("CDP failed"));
    };
  });
}
