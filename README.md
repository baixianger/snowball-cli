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
# As a CLI tool
bun add -g snowball-cli

# As an AI agent skill (Claude Code, Cursor, Windsurf, etc.)
npx skills add https://github.com/baixianger/snowball-cli
```

## Quick start

```bash

# No login needed for these:
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

## Commands

### Auth

| Command | Description |
|---|---|
| `snowball login` | QR code login (shown in terminal) |
| `snowball login --manual` | QR code login (scan in Chrome window) |
| `snowball token <cookie>` | Set token manually |
| `snowball status` | Check login status + verify token |

### Market

| Command | Description | Auth |
|---|---|:---:|
| `snowball quote <sym> [sym...]` | Real-time quote | |
| `snowball quote <sym> --detail` | Detailed (PE, PB, dividend, 52w) | * |
| `snowball pankou <sym>` | Order book / bid-ask levels | * |
| `snowball kline <sym> [--period day] [--count 120]` | K-line / candlestick | * |
| `snowball minute <sym>` | Minute-level chart | * |
| `snowball market` | Major indices overview | |

<details>
<summary>K-line periods</summary>

`1m` `5m` `15m` `30m` `60m` `120m` `day` `week` `month` `quarter` `year`
</details>

### Financials

| Command | Description |
|---|---|
| `snowball income <sym> [--count 5]` | Income statement |
| `snowball balance <sym> [--count 5]` | Balance sheet |
| `snowball cashflow <sym> [--count 5]` | Cash flow statement |
| `snowball indicator <sym> [--count 5]` | Key financial indicators |
| `snowball business <sym>` | Revenue breakdown by segment |
| `snowball forecast <sym>` | Earnings forecast |

### Company (F10)

| Command | Description |
|---|---|
| `snowball company <sym>` | Company profile |
| `snowball holders <sym> [--top]` | Shareholder count (--top for top 10) |
| `snowball bonus <sym>` | Dividend & bonus history |
| `snowball industry <sym>` | Industry & concept classification |
| `snowball org <sym>` | Institutional holding changes |

### Capital Flow

| Command | Description |
|---|---|
| `snowball flow <sym> [--history]` | Capital flow (intraday or daily history) |
| `snowball assort <sym>` | Capital by order size |
| `snowball margin <sym>` | Margin trading data |
| `snowball block <sym>` | Block (large) transactions |

### Social & News

| Command | Description |
|---|---|
| `snowball trending [day\|week\|month]` | Hot posts / KOL articles |
| `snowball live [--important]` | 7x24 live news feed |
| `snowball feed [category]` | Feed by category |
| `snowball hot [cn\|us\|hk\|global]` | Hot stocks by market |
| `snowball kol <sym>` | KOLs / influencers for a stock |
| `snowball user <user_id>` | A user's recent posts |
| `snowball profile <user_id>` | User profile |
| `snowball post <post_id>` | Single post detail |

<details>
<summary>Feed categories</summary>

`headlines` `today` `a-shares` `us` `hk` `funds` `private`
</details>

### Discovery

| Command | Description |
|---|---|
| `snowball search <keyword>` | Search stocks |
| `snowball search-user <keyword>` | Search users |
| `snowball screen [SH\|HK\|US]` | Stock screener |

### Funds (no auth needed)

| Command | Description |
|---|---|
| `snowball fund <code>` | Fund detail |
| `snowball fund <code> --nav` | NAV history |
| `snowball fund <code> --growth` | Growth performance |

## Symbol format

```
SH600519    Shanghai     贵州茅台         AAPL    US stock    Apple
SZ000858    Shenzhen     五粮液           01810   HK stock    Xiaomi
SZ300750    ChiNext      宁德时代         110011  Fund        易方达中小盘
```

## Agent workflows

```bash
# Morning briefing
snowball market && snowball live --important --count 10 && snowball trending --count 5

# Deep stock analysis
snowball quote SH600519 --detail
snowball income SH600519 --count 8
snowball indicator SH600519 --count 8
snowball holders SH600519 --top
snowball flow SH600519 --history

# KOL sentiment
snowball kol SH600519 --count 10       # Find KOLs
snowball user <id> --count 10          # Read their posts
snowball profile <id>                  # Check credibility

# Parse with jq
snowball quote SH600519 | jq '.[0].current'
snowball trending | jq '.[].author'
```

## How login works

```
snowball login
  │
  ├─ Start Chrome (background) → visit xueqiu.com → solve WAF
  ├─ Call Xueqiu API → generate QR code → render in terminal
  ├─ Wait for scan → poll status every 2.5s
  ├─ QR expired? → auto-regenerate (up to 3x)
  ├─ All failed? → fallback to manual Chrome mode
  └─ Success → save cookies to ~/.snowball-cli/token.json
```

Alternative: `snowball login --manual` opens Chrome window directly.

## License

MIT
