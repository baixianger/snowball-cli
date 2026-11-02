/**
 * URLs in errors must not carry Xueqiu credentials. Redirect Locations for
 * search-user include access_token, session_token, and the account id (`u`).
 * Keep the origin and path; drop the query and the hash.
 */

const SENSITIVE_PARAM = /\b(?:access_token|session_token|uuid)=[^&#\s"'<>]*/gi;
const USER_PARAM = /([?&])u=[^&#\s"'<>]*/g;
const URL_IN_TEXT = /https?:\/\/[^\s"'<>]*/g;

/** Origin and path only. A stripped query is shown as `?…`. */
export function redactUrl(raw: string): string {
  const input = raw.trim();
  if (!input) return input;
  try {
    const url = new URL(input);
    const hidden = url.search !== "" || url.hash !== "";
    url.search = "";
    url.hash = "";
    const shown = url.toString();
    return hidden ? `${shown}?…` : shown;
  } catch {
    return input.replace(/[?#].*/, "?…");
  }
}

/** Redact URLs and leftover credential query params inside an error string. */
export function redactSensitiveText(text: string): string {
  const withoutUrls = text.replace(URL_IN_TEXT, (match) => {
    const trimmed = match.replace(/[),.;]+$/, "");
    return redactUrl(trimmed) + match.slice(trimmed.length);
  });
  return withoutUrls
    .replace(SENSITIVE_PARAM, (match) => `${match.slice(0, match.indexOf("="))}=…`)
    .replace(USER_PARAM, "$1u=…");
}
