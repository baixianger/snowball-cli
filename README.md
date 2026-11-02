<p align="center">
  <img src="https://raw.githubusercontent.com/baixianger/snowball-cli/main/logo.png" width="160" alt="Snowball CLI" />
</p>

<h1 align="center">Snowball CLI</h1>

<p align="center">
  <strong>Xueqiu stock data for AI agents</strong><br/>
  <sub>30 commands | A-shares, HK, US stocks & funds | JSON output</sub>
</p>

<p align="center">
  <a href="https://github.com/baixianger/snowball-cli/blob/main/README.zh-CN.md">中文文档</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/snowball-cli"><img src="https://img.shields.io/npm/v/snowball-cli?color=cb3837&logo=npm&logoColor=white" alt="npm" /></a>
  <a href="https://github.com/baixianger/snowball-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license" /></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/runtime-Bun-f472b6?logo=bun&logoColor=white" alt="Bun" /></a>
  <img src="https://img.shields.io/badge/commands-30-orange" alt="commands" />
  <img src="https://img.shields.io/badge/data-Xueqiu%20%E9%9B%AA%E7%90%83-1DA1F2" alt="data source" />
</p>

---

A CLI that wraps [Xueqiu (雪球)](https://xueqiu.com) APIs into JSON for AI agents and scripts.

## Install

**Breaking:** as of 0.3.2 the `snowball` bin requires [Bun](https://bun.sh) on `PATH` (`#!/usr/bin/env bun`, Bun-targeted build). It does not run under Node (`console is not async iterable`). `npm install -g` without Bun will not start the CLI.

```bash
curl -fsSL https://bun.sh/install | bash
bun add -g snowball-cli
```

> **VPS / Docker / OpenClaw?** See the [Setup Guide](https://github.com/baixianger/snowball-cli/blob/main/docs/setup.md).

## Quick start

```bash
# No login needed:
snowball quote SH600519 SZ000858       # Real-time quotes
snowball market                         # Major indices
snowball fund 110011 --nav              # Fund NAV history

# Login for full access (QR code in terminal)
snowball login

# Then use everything
snowball kline SH600519 --period week
snowball trending day --count 5
snowball kol SH600519
```

## Auth

| Command | Description |
|---|---|
| `snowball login` | QR code in the terminal — scan with the Xueqiu app |
| `snowball login --qr-png <file>` | Write a PNG and wait until the app confirms (no ENTER). For agents that send the image to a phone |
| `snowball login --phone <number> [--area-code 86]` | Phone + SMS. Prompts `请输入短信验证码:` and finishes in this command. Default area code is 86; `45` is Denmark |
| `snowball login --phone <number> --no-wait` | Send the SMS, print `SMS_SENT=1`, and exit. Same when stdin is not a TTY |
| `snowball login --sms-code <code>` | Finish from the saved session (after `--no-wait`, or if the prompt was killed) |
| `snowball login --captcha-click <x,y>` | Resume a saved GeeTest challenge and send the SMS. Coordinates are pixels in the PNG |
| `snowball login --timeout <seconds>` | How long QR refresh or the SMS send may run (default 600) |
| `snowball login --manual` | Opens a Chrome window for you to scan |
| `snowball token <cookie>` | Paste cookie from DevTools |
| `snowball export` / `import <b64>` | Transfer token between machines |
| `snowball status` | Verify token is active |
| `snowball logout` | Remove saved token |

Set `CHROME_PATH` or use `--chrome <path>` for custom Chrome/Chromium location.

## Commands

### Market

| Command | Description | Auth |
|---|---|:---:|
| `snowball quote <sym> [sym...]` | Real-time quote | |
| `snowball quote <sym> --detail` | PE, PB, dividend, 52w | * |
| `snowball pankou <sym>` | Order book / bid-ask | * |
| `snowball kline <sym> [--period day] [--count 120]` | K-line / candlestick | * |
| `snowball minute <sym>` | Minute-level chart | * |
| `snowball market` | Major indices overview | |

### Financials

| Command | Description |
|---|---|
| `snowball income / balance / cashflow / indicator <sym>` | Financial statements |
| `snowball business <sym>` | Revenue by segment |
| `snowball forecast <sym>` | Earnings forecast |

### Company (F10)

| Command | Description |
|---|---|
| `snowball company <sym>` | Company profile |
| `snowball holders <sym> [--top]` | Shareholder count / top 10 |
| `snowball bonus <sym>` | Dividend history |
| `snowball industry <sym>` | Industry classification |
| `snowball org <sym>` | Institutional holdings |

### Capital Flow

| Command | Description |
|---|---|
| `snowball flow <sym> [--history]` | Capital flow |
| `snowball assort <sym>` | By order size |
| `snowball margin <sym>` | Margin trading |
| `snowball block <sym>` | Block transactions |

### Social & News

| Command | Description |
|---|---|
| `snowball trending [day\|week\|month]` | Hot posts / KOL articles |
| `snowball live [--important]` | 7x24 live news |
| `snowball feed [category]` | Feed (headlines, today, a-shares, us, hk, funds) |
| `snowball hot [cn\|us\|hk\|global]` | Hot stocks |
| `snowball kol <sym>` | KOLs for a stock |
| `snowball user <id>` / `profile <id>` / `post <id>` | User posts / profile / single post |

### Discovery & Funds

| Command | Description | Auth |
|---|---|:---:|
| `snowball search <keyword>` | Search stocks | * |
| `snowball search-user <keyword>` | Search users | * |
| `snowball screen [SH\|HK\|US]` | Stock screener | * |
| `snowball fund <code> [--nav\|--growth]` | Fund detail / NAV / growth | |

## Symbol format

```
SH600519  Shanghai  贵州茅台      AAPL   US stock   Apple
SZ000858  Shenzhen  五粮液        01810  HK stock   Xiaomi
SZ300750  ChiNext   宁德时代      110011 Fund       易方达中小盘
```

## Agent workflows

```bash
# Morning briefing
snowball market && snowball live --important --count 10 && snowball trending --count 5

# Deep stock analysis
snowball quote SH600519 --detail
snowball income SH600519 --count 8
snowball holders SH600519 --top
snowball flow SH600519 --history

# KOL sentiment
snowball kol SH600519 --count 10
snowball user <id> --count 10
snowball profile <id>
```

## How login works

```
snowball login [--qr-png <file>]
  ├─ Find Chrome/Chromium (CHROME_PATH > --chrome > auto-detect)
  ├─ Linux: --no-sandbox, drop stale Singleton* locks
  ├─ No DISPLAY: Xvfb + a real window (headless Chrome cannot pass Xueqiu's WAF)
  ├─ Open www.xueqiu.com → read WAF cookies
  ├─ POST /snb/provider/generate-qr-code
  ├─ Print a terminal QR and/or write a PNG (QR_PNG=<path>)
  ├─ GET https://www.xueqiu.com/snb/provider/query-qr-code-state
  │    (the apex host 301s here and fetch() would drop Cookie, which is HTTP 400.
  │     Redirects are followed only to https://*.xueqiu.com.)
  ├─ On expiry or a 2 min silence, refresh the QR until --timeout (default 10 min)
  ├─ Wait until the app confirms. No ENTER when stdin is not a TTY, or when --qr-png is set
  ├─ Stop the Xvfb this command started
  └─ Save cookies to ~/.snowball-cli/token.json (file 0600, directory 0700)

snowball login --phone <number> [--area-code 86] [--no-wait] [--timeout 600]
  ├─ Same Chrome / Xvfb startup as the QR flow
  ├─ Open the www.xueqiu.com login modal (验证码登录)
  ├─ Check 阅读并同意, fill the number, click 发送验证码
  ├─ GeeTest (available:1) on a TTY → CAPTCHA_REQUIRED=<png>
  │    then prompt 请输入点击坐标 (x,y;x,y): while that widget is still open
  ├─ No TTY, or a captcha with no coordinates yet → save the session and exit
  │    snowball login --captcha-click x,y   resumes, sends, and exits
  ├─ On send, write ~/.snowball-cli/sms-login/session.json (dir 0700, file 0600)
  │    and stop Chrome and the Xvfb this command started
  ├─ A TTY prompts 请输入短信验证码: and POSTs /snb/provider/login (SM4)
  │    A wrong code prompts again and does not send another SMS
  ├─ No TTY, or --no-wait → print SMS_SENT=1 and exit
  │    snowball login --sms-code <code> finishes from the saved session
  │    Killing the prompt after the SMS was sent still leaves that file
  ├─ Error 20099 resubmits once with is_register=1
  ├─ LOGIN_OK=1 only when xq_is_login is set; token.json stays mode 0600
  └─ The session expires after 10 minutes. A wrong code leaves it in place.
     The phone, code, and cookies are not logged
```

## License

MIT
