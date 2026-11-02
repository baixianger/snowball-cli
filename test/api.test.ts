import { describe, expect, test } from "bun:test";
import { XUEQIU_URL, fetchApi, parseApiBody, requireData, resolveApiRedirect } from "../lib/api";
import { redactSensitiveText, redactUrl } from "../lib/redact";

const TOKEN_QUERY = "u=12345&q=%E4%BB%B7%E6%8A%95&access_token=secret-token&session_token=sess-value&uuid=abc-uuid";
const APEX_USER_SEARCH = `https://xueqiu.com/query/v1/old/search/user?${TOKEN_QUERY}`;
const WWW_USER_SEARCH = `https://www.xueqiu.com/query/v1/old/search/user?${TOKEN_QUERY}`;
const SECRETS = ["secret-token", "sess-value", "abc-uuid", "12345", "access_token=", "session_token=", "uuid=", "u=12345", "价投"];

function expectNoSecrets(text: string) {
  for (const secret of SECRETS) {
    expect(text.includes(secret)).toBe(false);
  }
}

describe("Xueqiu API host", () => {
  test("search and the other site APIs use www so a 301 cannot drop Cookie", () => {
    expect(XUEQIU_URL).toBe("https://www.xueqiu.com");
    expect(XUEQIU_URL.includes("://xueqiu.com")).toBe(false);
  });

  test("a body with no data, or non-JSON, is an error", () => {
    const path = "/query/v1/suggest_stock.json";
    expect(() => requireData({}, path)).toThrow(/had no data/);
    expect(() => requireData({ data: null }, path)).toThrow(/had no data/);
    expect(() => requireData({ data: { list: null } }, path, "list")).toThrow(/had no data/);
    expect(requireData({ data: [{ code: "00700" }] }, path)).toEqual([{ code: "00700" }]);
    expect(requireData({ data: [] }, path)).toEqual([]);

    expect(() => parseApiBody("<html>login</html>", path)).toThrow(/non-JSON/);
    expect(() => parseApiBody("", path)).toThrow(/non-JSON/);
    expect(() => parseApiBody("null", path)).toThrow(/non-JSON/);
    expect(parseApiBody('{"data":{"q":"腾讯"}}', path)).toEqual({ data: { q: "腾讯" } });
    expect(() => parseApiBody('{"error_code":400016,"error_description":"请重新登录"}', path)).toThrow(/400016/);
    let apiError = "";
    try {
      parseApiBody(
        '{"error_code":1,"error_description":"see https://xueqiu.com/x?access_token=secret-token&u=12345&session_token=sess-value&uuid=abc-uuid"}',
        path,
      );
    } catch (err) {
      apiError = err instanceof Error ? err.message : String(err);
    }
    expect(apiError).toMatch(/API error 1/);
    expectNoSecrets(apiError);
  });
});

describe("URL redaction", () => {
  test("query strings with access_token, session_token, u, and uuid are not kept", () => {
    const raw = `https://xueqiu.com/query/v1/old/search/user?${TOKEN_QUERY}`;
    const redacted = redactUrl(raw);
    expect(redacted).toBe("https://xueqiu.com/query/v1/old/search/user?…");
    expect(redacted).toContain("/query/v1/old/search/user");
    expectNoSecrets(redacted);
    expectNoSecrets(redactSensitiveText(
      `Xueqiu redirected /users/search.json (302 to ${raw}).`,
    ));
    expect(redactUrl("https://www.xueqiu.com/users/search.json")).toBe(
      "https://www.xueqiu.com/users/search.json",
    );
  });
});

describe("API redirects", () => {
  test("search-user follows the apex user search and replays Cookie", async () => {
    const seen: { url: string; cookie: string | null }[] = [];
    const doFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const cookie = new Headers(init?.headers).get("cookie");
      seen.push({ url, cookie });
      if (seen.length === 1) {
        return new Response(null, { status: 302, headers: { Location: APEX_USER_SEARCH } });
      }
      if (seen.length === 2) {
        return new Response(null, { status: 301, headers: { Location: WWW_USER_SEARCH } });
      }
      return new Response(JSON.stringify({ users: [{ id: 1, screen_name: "价投" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const res = await fetchApi(
      "https://www.xueqiu.com/users/search.json?q=%E4%BB%B7%E6%8A%95&count=10&page=1",
      "xq_a_token=secret; u=9",
      {},
      doFetch,
    );
    const body = parseApiBody(await res.text(), "/users/search.json");
    expect(body.users).toEqual([{ id: 1, screen_name: "价投" }]);
    expect(seen.map((hit) => hit.url)).toEqual([
      "https://www.xueqiu.com/users/search.json?q=%E4%BB%B7%E6%8A%95&count=10&page=1",
      new URL(APEX_USER_SEARCH).toString(),
      new URL(WWW_USER_SEARCH).toString(),
    ]);
    expect(seen.every((hit) => hit.cookie === "xq_a_token=secret; u=9")).toBe(true);
  });

  test("an off-host Location is refused and the error does not contain the token", async () => {
    const seen: string[] = [];
    const doFetch = async (input: RequestInfo | URL) => {
      seen.push(String(input));
      return new Response(null, {
        status: 302,
        headers: {
          Location: "https://evil.example/steal?access_token=secret-token&u=12345&session_token=sess-value&uuid=abc-uuid",
        },
      });
    };

    let message = "";
    try {
      await fetchApi("https://www.xueqiu.com/users/search.json?q=1", "xq_a_token=secret", {}, doFetch);
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toMatch(/evil\.example/);
    expectNoSecrets(message);
    expect(seen).toEqual(["https://www.xueqiu.com/users/search.json?q=1"]);
  });

  test("too many hops stops without printing the redirect query", async () => {
    let hits = 0;
    const doFetch = async () => {
      hits++;
      return new Response(null, { status: 302, headers: { Location: APEX_USER_SEARCH } });
    };

    let message = "";
    try {
      await fetchApi("https://www.xueqiu.com/users/search.json", "xq_a_token=secret", {}, doFetch);
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toMatch(/Stopped after 3 hops/);
    expect(message).toContain("/query/v1/old/search/user");
    expectNoSecrets(message);
    expect(hits).toBe(4);
  });

  test("danjuan stays on itself and does not receive the Xueqiu cookie", async () => {
    const seen: { url: string; cookie: string | null }[] = [];
    const doFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push({ url: String(input), cookie: new Headers(init?.headers).get("cookie") });
      if (seen.length === 1) {
        return new Response(null, {
          status: 302,
          headers: { Location: "https://danjuanapp.com/djapi/fund/detail/000001?access_token=secret-token" },
        });
      }
      return new Response(JSON.stringify({ data: { fd_code: "000001" } }), { status: 200 });
    };

    const res = await fetchApi(
      "https://danjuanapp.com/djapi/fund/detail/000001",
      "xq_a_token=secret",
      { Cookie: "xq_a_token=secret" },
      doFetch,
    );
    expect(res.status).toBe(200);
    expect(seen[1]?.url).toContain("https://danjuanapp.com/djapi/fund/detail/000001");
    expect(seen.every((hit) => hit.cookie == null)).toBe(true);
    expect(resolveApiRedirect(
      "https://www.xueqiu.com/users/search.json",
      APEX_USER_SEARCH,
      true,
    )).toBe(new URL(APEX_USER_SEARCH).toString());
  });

  test("a cookieless fund redirect may move from danjuanapp.com to danjuanfunds.com", async () => {
    const seen: { url: string; cookie: string | null }[] = [];
    const doFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push({ url: String(input), cookie: new Headers(init?.headers).get("cookie") });
      if (seen.length === 1) {
        return new Response(null, {
          status: 301,
          headers: {
            Location: "https://danjuanfunds.com/djapi/fund/detail/000001?access_token=secret-token&u=12345",
          },
        });
      }
      return new Response(JSON.stringify({ data: { fd_name: "华夏成长" } }), { status: 200 });
    };

    const res = await fetchApi("https://danjuanapp.com/djapi/fund/detail/000001", undefined, {}, doFetch);
    const body = parseApiBody(await res.text(), "/djapi/fund/detail/000001");
    expect(body.data.fd_name).toBe("华夏成长");
    expect(seen[1]?.url).toContain("https://danjuanfunds.com/djapi/fund/detail/000001");
    expect(seen.every((hit) => hit.cookie == null)).toBe(true);

    let message = "";
    try {
      resolveApiRedirect(
        "https://danjuanapp.com/djapi/fund/detail/000001",
        "https://danjuanfunds.com/djapi/fund/detail/000001?access_token=secret-token&u=12345&session_token=sess-value&uuid=abc-uuid",
        true,
      );
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toMatch(/danjuanfunds\.com/);
    expectNoSecrets(message);
    expect(() => resolveApiRedirect(
      "https://stock.xueqiu.com/v5/stock/realtime/quotec.json",
      "https://evil.example/steal?access_token=secret-token&u=12345",
      false,
    )).toThrow(/evil\.example/);
  });
});
