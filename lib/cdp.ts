/**
 * A CDP session attached to one Xueqiu page target.
 * Commands go to that page so cookies, GeeTest, and SM4 stay in the site's own JS.
 */

export interface CdpSession {
  send(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<any>;
  onEvent(fn: (method: string, params: any) => void): () => void;
  close(): void;
}

function messageText(data: unknown): string {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (ArrayBuffer.isView(data)) return new TextDecoder().decode(data as ArrayBufferView);
  return "";
}

export async function connectCdp(webSocketDebuggerUrl: string): Promise<CdpSession> {
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("CDP connection timed out"));
    }, 10000);
    ws.onopen = () => {
      clearTimeout(timer);
      resolve();
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("CDP connection failed"));
    };
  });

  let next = 1;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  const listeners = new Set<(method: string, params: any) => void>();

  ws.onmessage = (event) => {
    let msg: any;
    try {
      msg = JSON.parse(messageText(event.data));
    } catch {
      return;
    }
    if (msg.id && pending.has(msg.id)) {
      const waiter = pending.get(msg.id)!;
      pending.delete(msg.id);
      if (msg.error) waiter.reject(new Error(msg.error.message || "CDP command failed"));
      else waiter.resolve(msg.result);
      return;
    }
    if (msg.method) {
      for (const listener of listeners) listener(msg.method, msg.params ?? {});
    }
  };

  const failPending = (error: Error) => {
    for (const waiter of pending.values()) waiter.reject(error);
    pending.clear();
  };
  ws.onclose = () => failPending(new Error("CDP connection closed"));

  return {
    send(method, params = {}, timeoutMs = 20000) {
      const id = next++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (!pending.has(id)) return;
          pending.delete(id);
          reject(new Error(`CDP ${method} timed out`));
        }, timeoutMs);
        pending.set(id, {
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    onEvent(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    close() {
      ws.close();
    },
  };
}

/** Attach to the newest xueqiu.com page target. */
export async function connectXueqiuPage(cdpUrl: string): Promise<CdpSession> {
  const targets = await (await fetch(`${cdpUrl}/json/list`)).json() as any[];
  const pages = targets.filter(
    (target) => target.type === "page" && /xueqiu\.com/.test(target.url || "") && target.webSocketDebuggerUrl,
  );
  if (pages.length === 0) throw new Error("No xueqiu.com tab found in Chrome");
  pages.sort((a, b) => Number(/www\.xueqiu\.com/.test(b.url || "")) - Number(/www\.xueqiu\.com/.test(a.url || "")));
  const session = await connectCdp(pages[0].webSocketDebuggerUrl);
  await session.send("Network.enable");
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  try {
    // Screenshot pixels then match --captcha-click coordinates.
    await session.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
  } catch {
    // Some builds reject the override. Clicks still use CSS pixels.
  }
  return session;
}
