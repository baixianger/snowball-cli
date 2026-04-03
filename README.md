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

```bash
npm install -g snowball-cli     # or: bun add -g snowball-cli
```

> **VPS / Docker / OpenClaw?** See the [Setup Guide](docs/setup.md).

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
| `snowball login` | QR code in terminal — scan with Xueqiu app |
| `snowball login --manual` | Opens Chrome window for you to scan |
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
snowball login
  ├─ Find Chrome/Chromium (CHROME_PATH > --chrome > auto-detect)
  ├─ Start browser (auto-headless on VPS) → xueqiu.com → solve WAF
  ├─ Generate QR via API → render in terminal
  ├─ Poll scan status → auto-regenerate if expired (3x)
  ├─ Fallback to manual Chrome mode if QR fails
  └─ Save cookies to ~/.snowball-cli/token.json
```

## License

MIT
