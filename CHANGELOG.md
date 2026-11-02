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
- `snowball login --phone <number> [--area-code 86]` sends an SMS from the www.xueqiu.com login modal, then prompts `请输入短信验证码:` and finishes in the same command. A wrong code prompts again and does not send another SMS. GeeTest prompts `请输入点击坐标 (x,y;x,y):` while that widget is still open.
- With no TTY, or with `--no-wait`, the command writes `~/.snowball-cli/sms-login/session.json` (directory `0700`, file `0600`) as soon as the SMS is sent, prints `SMS_SENT=1`, stops Chrome and Xvfb, and exits. `snowball login --sms-code <code>` finishes from that file, including when the interactive process was killed after the send. A wrong code leaves the file in place. It expires after 10 minutes.
- GeeTest with no TTY prints `CAPTCHA_REQUIRED=<png>` and exits. `snowball login --captcha-click x,y` opens a new widget, applies those pixels, sends the SMS, and exits.
- Xueqiu error 20099 resubmits once with `is_register=1`. Success still requires `xq_is_login`, then prints `LOGIN_OK=1`. Phone numbers are logged masked (`138****8000`); codes and cookies are not logged.
- `snowball login --help` and `snowball login -h` print login usage and do not start Chrome.
