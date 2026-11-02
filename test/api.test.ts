import { describe, expect, test } from "bun:test";
import { XUEQIU_URL, parseApiBody, requireData } from "../lib/api";

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
  });
});
