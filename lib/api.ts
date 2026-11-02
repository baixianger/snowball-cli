/**
 * Xueqiu HTTP API client
 *
 * ~80 endpoints reverse-engineered from xueqiu.com web interface.
 * Requires valid cookie (xq_a_token) for most endpoints.
 *
 * Sources: pysnowball, xueqiu-api, 1dot75cm/xueqiu, go-xueqiu
 */

import { getCookie } from "./auth";

const STOCK_URL = "https://stock.xueqiu.com";
/**
 * www, not the apex. GET https://xueqiu.com is a 301 to www, and fetch drops
 * the Cookie header on that redirect, so search and the other /query and
 * /statuses calls came back with no `data` and the CLI printed `undefined`.
 */
export const XUEQIU_URL = "https://www.xueqiu.com";
const DANJUAN_URL = "https://danjuanapp.com";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Origin": XUEQIU_URL,
  "Referer": `${XUEQIU_URL}/`,
  "X-Requested-With": "XMLHttpRequest",
};

/** Parse a Xueqiu body. HTML or other non-JSON becomes an error, not `undefined`. */
export function parseApiBody(text: string, path: string): any {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Xueqiu returned a non-JSON response for ${path}`);
  }
  if (data == null || typeof data !== "object") {
    throw new Error(`Xueqiu returned a non-JSON response for ${path}`);
  }
  const record = data as Record<string, unknown>;
  if (record.error_code) {
    const description = record.error_description ? `: ${record.error_description}` : "";
    throw new Error(`API error ${record.error_code}${description}`);
  }
  return data;
}

/** Helpers that print `body.data` must fail when that field is missing. */
export function requireData(body: any, path: string, field?: string): any {
  if (body == null || typeof body !== "object" || body.data == null) {
    throw new Error(`Xueqiu response for ${path} had no data`);
  }
  if (field === undefined) return body.data;
  if (body.data[field] == null) {
    throw new Error(`Xueqiu response for ${path} had no data`);
  }
  return body.data[field];
}

async function readResponse(res: Response, path: string): Promise<any> {
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    throw new Error(
      `Xueqiu redirected ${path} (${res.status}${location ? ` to ${location}` : ""}). Refusing to follow because fetch drops Cookie on redirect.`,
    );
  }
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.replace(/\s+/g, " ").slice(0, 180)}`);
  }
  return parseApiBody(text, path);
}

function withParams(path: string, params: Record<string, string | number>, base: string): string {
  const url = new URL(path, base);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function request(path: string, params: Record<string, string | number> = {}, base = STOCK_URL): Promise<any> {
  const cookie = getCookie();
  const res = await fetch(withParams(path, params, base), {
    headers: { ...HEADERS, Cookie: cookie },
    redirect: "manual",
  });
  return readResponse(res, path);
}

async function requestData(
  path: string,
  params: Record<string, string | number> = {},
  base = STOCK_URL,
  field?: string,
): Promise<any> {
  return requireData(await request(path, params, base), path, field);
}

/** Request without token (for public endpoints like quotec) */
async function requestPublic(path: string, params: Record<string, string | number> = {}, base = STOCK_URL): Promise<any> {
  const res = await fetch(withParams(path, params, base), {
    headers: { ...HEADERS },
    redirect: "manual",
  });
  return readResponse(res, path);
}

async function requestPublicData(
  path: string,
  params: Record<string, string | number> = {},
  base = STOCK_URL,
  field?: string,
): Promise<any> {
  return requireData(await requestPublic(path, params, base), path, field);
}

// ═══════════════════════════════════════════════════════════════
//  QUOTES
// ═══════════════════════════════════════════════════════════════

/** Real-time quote (works WITHOUT token) */
export async function quote(symbols: string | string[]): Promise<any> {
  const sym = Array.isArray(symbols) ? symbols.join(",") : symbols;
  return requestPublicData("/v5/stock/realtime/quotec.json", { symbol: sym });
}

/** Detailed quote with PE, PB, dividend, 52w high/low */
export async function quoteDetail(symbol: string): Promise<any> {
  return requestData("/v5/stock/quote.json", { symbol, extend: "detail" }, STOCK_URL, "quote");
}

/** Batch quote for multiple symbols */
export async function quoteBatch(symbols: string[]): Promise<any> {
  return requestData("/v5/stock/batch/quote.json", { symbol: symbols.join(",") });
}

/** Order book (bid/ask levels) */
export async function pankou(symbol: string): Promise<any> {
  return requestData("/v5/stock/realtime/pankou.json", { symbol });
}

/** Minute chart data */
export async function minute(symbol: string): Promise<any> {
  return requestData("/v5/stock/chart/minute.json", { symbol, period: "1d" });
}

// ═══════════════════════════════════════════════════════════════
//  KLINE
// ═══════════════════════════════════════════════════════════════

/** K-line / candlestick data */
export async function kline(
  symbol: string,
  period: "1m" | "5m" | "15m" | "30m" | "60m" | "120m" | "day" | "week" | "month" | "quarter" | "year" = "day",
  count: number = 120,
  type: "before" | "after" | "normal" = "before"
): Promise<any> {
  return requestData("/v5/stock/chart/kline.json", {
    symbol,
    period,
    type,
    begin: Date.now(),
    count: -count,
    indicator: "kline,pe,pb,ps,pcf,market_capital",
  });
}

// ═══════════════════════════════════════════════════════════════
//  FINANCIALS
// ═══════════════════════════════════════════════════════════════

function detectRegion(symbol: string): "cn" | "hk" | "us" {
  if (symbol.startsWith("SH") || symbol.startsWith("SZ")) return "cn";
  if (/^\d{5}$/.test(symbol)) return "hk";
  return "us";
}

/** Income statement */
export async function income(symbol: string, type = "all", count = 5): Promise<any> {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/finance/${region}/income.json`, {
    symbol, type, is_detail: "true", count,
  }, STOCK_URL, "list");
}

/** Balance sheet */
export async function balance(symbol: string, type = "all", count = 5): Promise<any> {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/finance/${region}/balance.json`, {
    symbol, type, is_detail: "true", count,
  }, STOCK_URL, "list");
}

/** Cash flow statement */
export async function cashflow(symbol: string, type = "all", count = 5): Promise<any> {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/finance/${region}/cash_flow.json`, {
    symbol, type, is_detail: "true", count,
  }, STOCK_URL, "list");
}

/** Key financial indicators */
export async function indicator(symbol: string, type = "all", count = 5): Promise<any> {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/finance/${region}/indicator.json`, {
    symbol, type, is_detail: "true", count,
  }, STOCK_URL, "list");
}

/** Business revenue composition */
export async function business(symbol: string): Promise<any> {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/finance/${region}/business.json`, {
    symbol, is_detail: "true", count: 5,
  }, STOCK_URL, "list");
}

// ═══════════════════════════════════════════════════════════════
//  CAPITAL FLOW
// ═══════════════════════════════════════════════════════════════

/** Intraday capital flow */
export async function capitalFlow(symbol: string): Promise<any> {
  return requestData("/v5/stock/capital/flow.json", { symbol });
}

/** Historical daily capital flow */
export async function capitalHistory(symbol: string, count = 20): Promise<any> {
  return requestData("/v5/stock/capital/history.json", { symbol, count });
}

/** Capital assortment by order size */
export async function capitalAssort(symbol: string): Promise<any> {
  return requestData("/v5/stock/capital/assort.json", { symbol });
}

/** Margin trading data */
export async function margin(symbol: string, page = 1, size = 20): Promise<any> {
  return requestData("/v5/stock/capital/margin.json", { symbol, page, size });
}

/** Block transactions */
export async function blockTrans(symbol: string, page = 1, size = 20): Promise<any> {
  return requestData("/v5/stock/capital/blocktrans.json", { symbol, page, size });
}

// ═══════════════════════════════════════════════════════════════
//  F10 COMPANY DATA
// ═══════════════════════════════════════════════════════════════

/** Company profile */
export async function company(symbol: string): Promise<any> {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/f10/${region}/company.json`, { symbol });
}

/** Top 10 shareholders */
export async function topHolders(symbol: string, circula = 0): Promise<any> {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/f10/${region}/top_holders.json`, { symbol, circula });
}

/** Shareholder count history */
export async function holders(symbol: string): Promise<any> {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/f10/${region}/holders.json`, { symbol });
}

/** Dividends & bonuses */
export async function bonus(symbol: string, page = 1, size = 20): Promise<any> {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/f10/${region}/bonus.json`, { symbol, page, size });
}

/** Industry classification */
export async function industry(symbol: string): Promise<any> {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/f10/${region}/industry.json`, { symbol });
}

/** Institutional holding changes */
export async function orgHolding(symbol: string): Promise<any> {
  const region = detectRegion(symbol);
  return requestData(`/v5/stock/f10/${region}/org_holding/change.json`, { symbol });
}

// ═══════════════════════════════════════════════════════════════
//  REPORTS & FORECASTS
// ═══════════════════════════════════════════════════════════════

/** Earnings forecast */
export async function forecast(symbol: string): Promise<any> {
  return requestData("/stock/report/earningforecast.json", { symbol });
}

/** Latest research reports */
export async function reports(symbol: string): Promise<any> {
  return requestData("/stock/report/latest.json", { symbol });
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH & DISCOVERY
// ═══════════════════════════════════════════════════════════════

/** Search stocks by keyword */
export async function search(query: string, count = 10): Promise<any> {
  return requestData("/query/v1/suggest_stock.json", { q: query, count }, XUEQIU_URL);
}

/** Hot stocks list */
export async function hotStocks(type: "global" | "us" | "cn" | "hk" = "cn", size = 10): Promise<any> {
  const typeMap = { global: 10, us: 11, cn: 12, hk: 13 };
  return requestData("/v5/stock/hot_stock/list.json", {
    type: typeMap[type], size,
  });
}

// ═══════════════════════════════════════════════════════════════
//  MARKET INDICES
// ═══════════════════════════════════════════════════════════════

/** Major market indices */
export async function indices(): Promise<any> {
  return quote([
    "SH000001",  // 上证指数
    "SZ399001",  // 深证成指
    "SZ399006",  // 创业板指
    "SH000300",  // 沪深300
    "SH000016",  // 上证50
    "SH000905",  // 中证500
  ]);
}

// ═══════════════════════════════════════════════════════════════
//  SOCIAL / POSTS
// ═══════════════════════════════════════════════════════════════

/** News feed by category */
export async function feed(category: string = "headlines", count = 20): Promise<any> {
  const catMap: Record<string, number> = {
    "headlines": -1, "today": 0, "a-shares": 105, "us": 101, "hk": 102,
    "funds": 104, "private": 113, "realestate": 111, "auto": 114, "live": 6,
  };
  const catId = catMap[category] ?? -1;
  const data = await request("/v4/statuses/public_timeline_by_category.json", {
    since_id: -1, max_id: -1, category: catId, count,
  }, XUEQIU_URL);
  const list = data.list || [];
  return list.map((item: any) => {
    try {
      return formatPost(JSON.parse(item.data));
    } catch {
      return item;
    }
  });
}

/** Search posts/articles */
export async function searchPosts(query: string, count = 10, sort: "time" | "reply" | "relevance" = "relevance"): Promise<any> {
  return requestData("/statuses/search.json", {
    q: query, count, page: 1, sort, source: "all",
  }, XUEQIU_URL);
}

function formatPost(post: any) {
  return {
    id: post.id,
    title: post.title,
    description: (post.description || post.text || "").replace(/<[^>]+>/g, "").slice(0, 200),
    author: post.user?.screen_name,
    author_id: post.user?.id,
    author_followers: post.user?.followers_count,
    view_count: post.view_count,
    reply_count: post.reply_count,
    like_count: post.like_count ?? post.fav_count,
    retweet_count: post.retweet_count,
    created_at: post.created_at,
    url: post.target ? `${XUEQIU_URL}${post.target}` : null,
  };
}

/** Hot posts by time scope (day/week/month) */
export async function hotPosts(scope: "day" | "week" | "month" = "day", count = 10, page = 1): Promise<any> {
  const data = await request("/statuses/hots.json", {
    a: "1", count, page, scope, type: "status", meigu: "0",
  }, XUEQIU_URL);
  // Response is a direct array
  return (Array.isArray(data) ? data : []).map(formatPost);
}

/** 7x24 live news feed */
export async function liveNews(count = 20): Promise<any> {
  const data = await request("/statuses/livenews/list.json", {
    since_id: -1, max_id: -1, count,
  }, XUEQIU_URL);
  return (data.items || []).map((item: any) => ({
    id: item.id,
    text: item.text,
    created_at: item.created_at,
    url: item.target,
    mark: item.mark, // 1=important
    view_count: item.view_count,
    reply_count: item.reply_count,
  }));
}

/** KOLs / hot users for a stock */
export async function stockKOLs(symbol: string, count = 10): Promise<any> {
  const data = await request("/recommend/user/stock_hot_user.json", {
    symbol, start: 0, count,
  }, XUEQIU_URL);
  return (Array.isArray(data) ? data : []).map((u: any) => ({
    id: u.id,
    screen_name: u.screen_name,
    description: u.description,
    followers_count: u.followers_count,
    friends_count: u.friends_count,
    status_count: u.status_count,
    gender: u.gender,
    province: u.province,
    city: u.city,
    verified: u.verified,
    verified_description: u.verified_description,
    url: `${XUEQIU_URL}/u/${u.id}`,
  }));
}

/** User timeline — recent posts by a specific user */
export async function userPosts(userId: string, count = 10, page = 1): Promise<any> {
  const data = await request("/statuses/user_timeline.json", {
    user_id: userId, page, count,
  }, XUEQIU_URL);
  return (data.statuses || []).map(formatPost);
}

/** User profile */
export async function userProfile(userId: string): Promise<any> {
  const data = await request("/user/show.json", { id: userId }, XUEQIU_URL);
  return data;
}

/** Search users by keyword */
export async function searchUsers(query: string, count = 10, page = 1): Promise<any> {
  const data = await request("/users/search.json", { q: query, count, page }, XUEQIU_URL);
  return data.users ?? data;
}

/** Important-only live news (marked items) */
export async function liveNewsImportant(count = 20): Promise<any> {
  const data = await request("/statuses/livenews/mark/list.json", {
    since_id: -1, max_id: -1, size: count,
  }, XUEQIU_URL);
  return (data.items || []).map((item: any) => ({
    id: item.id,
    text: item.text,
    created_at: item.created_at,
    url: item.target,
    mark: item.mark,
    view_count: item.view_count,
    reply_count: item.reply_count,
  }));
}

/** Single post detail by ID */
export async function postDetail(postId: string): Promise<any> {
  const data = await request("/statuses/show.json", { id: postId }, XUEQIU_URL);
  return data;
}

// ═══════════════════════════════════════════════════════════════
//  PORTFOLIO / WATCHLIST
// ═══════════════════════════════════════════════════════════════

/** List user's watchlists */
export async function watchlists(): Promise<any> {
  return requestData("/v5/stock/portfolio/list.json", { system: "true" });
}

// ═══════════════════════════════════════════════════════════════
//  SCREENER
// ═══════════════════════════════════════════════════════════════

/** Screen stocks by criteria */
export async function screen(
  market: "SH" | "HK" | "US" = "SH",
  orderby = "symbol",
  page = 1,
  size = 30
): Promise<any> {
  return requestData("/stock/screener/screen.json", {
    category: market, orderby, order: "desc", page, size,
    current: "ALL", pct: "ALL",
  }, XUEQIU_URL);
}

// ═══════════════════════════════════════════════════════════════
//  FUND DATA (Danjuan)
// ═══════════════════════════════════════════════════════════════

/** Fund detail */
export async function fund(code: string): Promise<any> {
  return requestPublicData(`/djapi/fund/detail/${code}`, {}, DANJUAN_URL);
}

/** Fund NAV history */
export async function fundNav(code: string, page = 1, size = 30): Promise<any> {
  return requestPublicData(`/djapi/fund/nav/history/${code}`, { page, size }, DANJUAN_URL);
}

/** Fund growth performance */
export async function fundGrowth(code: string, period = "ty"): Promise<any> {
  return requestPublicData(`/djapi/fund/growth/${code}`, { day: period }, DANJUAN_URL);
}
