# Changelog

## 0.3.2

### Breaking

- The `snowball` bin requires Bun. It is `#!/usr/bin/env bun` and the published bundle is built with `bun build --target bun`. Node-only installs no longer work (`console is not async iterable`, and the bundle is not a Node build). Install Bun, then `bun add -g snowball-cli`.

### Fixed

- QR status polling calls `https://www.xueqiu.com`. A GET on the apex host is a 301, and `fetch` drops `Cookie` on that redirect, which came back as HTTP 400 before anyone scanned.
- Cookie-bearing redirects are followed only to `https://xueqiu.com` and `https://*.xueqiu.com`.
- Linux login starts a real Chrome window (`--no-sandbox`, stale `Singleton*` locks removed). Headless Chrome cannot pass Xueqiu's WAF. With no `DISPLAY`, Xvfb is started without `-ac` (MIT-MAGIC-COOKIE auth) and stopped when login finishes or fails.
- `~/.snowball-cli` and the Chrome profile directory are mode `0700`. `token.json` is mode `0600`, including files that already existed.

### Added

- `snowball login --qr-png <path>` writes a PNG and waits with no ENTER prompt.
- `snowball login --timeout <seconds>` (default 600). When one QR expires or sits for about 2 minutes, it is regenerated — the same PNG is overwritten and `QR_PNG=` is printed again — until that deadline.
