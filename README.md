<p align="center">
  <img src="https://raw.githubusercontent.com/baixianger/brainstorm/main/projects/snowball-cli/logo.png" width="128" alt="Snowball CLI logo" />
</p>

<h1 align="center">Snowball CLI</h1>

<p align="center"><strong>Xueqiu stock data for AI agents</strong></p>

<p align="center">
  <a href="https://www.npmjs.com/package/snowball-cli"><img src="https://img.shields.io/npm/v/snowball-cli?color=cb3837&logo=npm" alt="npm version" /></a>
  <a href="https://github.com/baixianger/snowball-cli/blob/main/LICENSE"><img src="https://img.shields.io/github/license/baixianger/snowball-cli" alt="license" /></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/runtime-Bun-f472b6?logo=bun" alt="Bun" /></a>
</p>

A CLI tool that wraps [Xueqiu (雪球)](https://xueqiu.com) stock data into JSON output for AI agents and scripts. Covers A-shares, HK, US stocks, and funds.

## Quick start

```bash
# Install
bun add -g snowball-cli

# Real-time quotes (no login needed)
snowball quote SH600519 SZ000858

# Login for full access (auto-launches Chrome, scan QR code)
snowball login

# Then use everything
snowball kline SH600519 --period week
snowball income SH600519
snowball hot cn
```

## Commands

### Authentication

| Command | Description |
|---|---|
| `snowball login` | Login via Chrome QR code (auto-launches Chrome) |
| `snowball token <cookie>` | Set token manually |
| `snowball status` | Check login status |

### Market Data

| Command | Description |
|---|---|
| `snowball quote <sym>` | Real-time quote (no login needed) |
| `snowball quote <sym> --detail` | Detailed quote (PE, PB, dividend) |
| `snowball pankou <sym>` | Order book (bid/ask) |
| `snowball kline <sym>` | K-line / candlestick |
| `snowball market` | Major indices overview |

### Financials

| Command | Description |
|---|---|
| `snowball income <sym>` | Income statement |
| `snowball balance <sym>` | Balance sheet |
| `snowball cashflow <sym>` | Cash flow |
| `snowball indicator <sym>` | Key financial indicators |
| `snowball forecast <sym>` | Earnings forecast |

### Company (F10)

| Command | Description |
|---|---|
| `snowball company <sym>` | Company profile |
| `snowball holders <sym>` | Shareholder count |
| `snowball holders <sym> --top` | Top 10 shareholders |

### Capital & Social

| Command | Description |
|---|---|
| `snowball flow <sym>` | Intraday capital flow |
| `snowball flow <sym> --history` | Historical daily flow |
| `snowball hot [cn\|us\|hk\|global]` | Hot stocks |
| `snowball feed [headlines\|a-shares\|us\|hk]` | News feed |
| `snowball search <keyword>` | Search stocks |

### Funds

| Command | Description |
|---|---|
| `snowball fund <code>` | Fund detail |
| `snowball fund <code> --nav` | NAV history |
| `snowball fund <code> --growth` | Growth performance |

## Symbol format

| Format | Market | Example |
|---|---|---|
| `SH600519` | Shanghai A-share | Maotai |
| `SZ000858` | Shenzhen A-share | Wuliangye |
| `AAPL` | US stock | Apple |
| `01810` | HK stock | Xiaomi |

## Agent usage

All output is JSON — pipe to `jq` or use in scripts:

```bash
# Get Maotai's current price
snowball quote SH600519 | jq '.[0].current'

# Get last 5 quarterly income statements
snowball income SH600519 --count 5

# Search and get first result's symbol
snowball search "宁德时代" | jq '.[0].code'
```

## How login works

1. `snowball login` auto-launches Chrome with a dedicated profile
2. Opens xueqiu.com — scan QR code with Xueqiu app
3. Cookies are auto-extracted and saved to `~/.snowball-cli/token.json`
4. Token persists until it expires (usually weeks)

No manual cookie copying needed.

## License

MIT
