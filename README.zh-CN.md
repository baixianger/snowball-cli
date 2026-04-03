<p align="center">
  <img src="https://raw.githubusercontent.com/baixianger/snowball-cli/main/logo.png" width="160" alt="Snowball CLI" />
</p>

<h1 align="center">Snowball CLI</h1>

<p align="center">
  <strong>雪球股票数据命令行工具 — 为 AI Agent 而生</strong><br/>
  <sub>30 条命令 | A 股、港股、美股、基金全覆盖 | JSON 输出</sub>
</p>

<p align="center">
  <a href="https://github.com/baixianger/snowball-cli#readme">English</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/snowball-cli"><img src="https://img.shields.io/npm/v/snowball-cli?color=cb3837&logo=npm&logoColor=white" alt="npm" /></a>
  <a href="https://github.com/baixianger/snowball-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license" /></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/runtime-Bun-f472b6?logo=bun&logoColor=white" alt="Bun" /></a>
  <img src="https://img.shields.io/badge/commands-30-orange" alt="commands" />
  <img src="https://img.shields.io/badge/data-雪球%20Xueqiu-1DA1F2" alt="数据源" />
</p>

---

封装[雪球](https://xueqiu.com) API 的命令行工具，JSON 输出，为 AI Agent 和脚本设计。

## 安装

```bash
# 命令行工具
npm install -g snowball-cli     # 或
bun add -g snowball-cli

# AI Agent 技能（Claude Code、Cursor、Windsurf 等）
npx skills add https://github.com/baixianger/snowball-cli     # 或
bunx skills add https://github.com/baixianger/snowball-cli
```

## 快速开始

```bash

# 以下命令无需登录：
snowball quote SH600519 SZ000858       # 实时行情
snowball market                         # 大盘指数
snowball fund 110011 --nav              # 基金净值

# 登录后解锁全部功能（终端内扫码）
snowball login

# 尽情使用
snowball kline SH600519 --period week
snowball trending day --count 5
snowball kol SH600519
```

## 命令一览

### 登录认证

**登录** — 需要 Chrome 或 Chromium（自动检测）：

| 命令 | 说明 |
|---|---|
| `snowball login` | 终端内显示二维码，用雪球 App 扫码 |
| `snowball login --manual` | 打开 Chrome 窗口扫码 |
| `snowball login --chrome <路径>` | 指定 Chrome/Chromium 路径 |

设置 `CHROME_PATH` 环境变量可以省去每次 `--chrome`。

**Token 传输** — 用于 VPS / 无头服务器 / Docker：

| 命令 | 说明 |
|---|---|
| `snowball export` | 导出 token 为 base64（在本地机器运行） |
| `snowball import <base64>` | 导入 token（在 VPS/Docker 运行） |

一行搞定：`ssh vps "snowball import $(snowball export)"`

**手动设置** — 只有浏览器 DevTools 时的兜底方案：

| 命令 | 说明 |
|---|---|
| `snowball token <cookie>` | 粘贴 DevTools 中的 cookie 字符串 |

复制路径：Chrome DevTools → Application → Cookies → xueqiu.com，然后：

```bash
snowball token "xq_a_token=abc123def456; u=781234567890"
```

**状态与清理：**

| 命令 | 说明 |
|---|---|
| `snowball status` | 查看登录状态，自动验证 token 有效性 |
| `snowball logout` | 删除已保存的 token |

### 行情

| 命令 | 说明 | 认证 |
|---|---|:---:|
| `snowball quote <代码> [代码...]` | 实时行情 | |
| `snowball quote <代码> --detail` | 详细（PE、PB、股息率、52 周高低） | * |
| `snowball pankou <代码>` | 盘口 / 买卖五档 | * |
| `snowball kline <代码> [--period day] [--count 120]` | K 线数据 | * |
| `snowball minute <代码>` | 分时图 | * |
| `snowball market` | 大盘指数总览 | |

<details>
<summary>K 线周期</summary>

`1m` `5m` `15m` `30m` `60m` `120m` `day` `week` `month` `quarter` `year`
</details>

### 财务数据

| 命令 | 说明 |
|---|---|
| `snowball income <代码> [--count 5]` | 利润表 |
| `snowball balance <代码> [--count 5]` | 资产负债表 |
| `snowball cashflow <代码> [--count 5]` | 现金流量表 |
| `snowball indicator <代码> [--count 5]` | 关键财务指标 |
| `snowball business <代码>` | 营收构成（按业务分拆） |
| `snowball forecast <代码>` | 盈利预测 |

### 公司资料 (F10)

| 命令 | 说明 |
|---|---|
| `snowball company <代码>` | 公司简介 |
| `snowball holders <代码> [--top]` | 股东人数变化（--top 十大股东） |
| `snowball bonus <代码>` | 分红送转历史 |
| `snowball industry <代码>` | 行业与概念分类 |
| `snowball org <代码>` | 机构持仓变动 |

### 资金流向

| 命令 | 说明 |
|---|---|
| `snowball flow <代码> [--history]` | 资金流向（日内或历史） |
| `snowball assort <代码>` | 按单量分布（大/中/小单） |
| `snowball margin <代码>` | 融资融券 |
| `snowball block <代码>` | 大宗交易 |

### 社交与资讯

| 命令 | 说明 |
|---|---|
| `snowball trending [day\|week\|month]` | 热帖排行（大 V 观点） |
| `snowball live [--important]` | 7x24 实时快讯 |
| `snowball feed [分类]` | 分类信息流 |
| `snowball hot [cn\|us\|hk\|global]` | 热门股票 |
| `snowball kol <代码>` | 个股相关大 V |
| `snowball user <用户ID>` | 用户最新帖子 |
| `snowball profile <用户ID>` | 用户主页 |
| `snowball post <帖子ID>` | 单条帖子详情 |

<details>
<summary>信息流分类</summary>

`headlines`（头条）`today`（今日话题）`a-shares`（沪深）`us`（美股）`hk`（港股）`funds`（基金）`private`（私募）
</details>

### 搜索与发现

| 命令 | 说明 |
|---|---|
| `snowball search <关键词>` | 搜索股票 |
| `snowball search-user <关键词>` | 搜索用户 |
| `snowball screen [SH\|HK\|US]` | 选股器 |

### 基金（无需登录）

| 命令 | 说明 |
|---|---|
| `snowball fund <基金代码>` | 基金详情 |
| `snowball fund <基金代码> --nav` | 净值历史 |
| `snowball fund <基金代码> --growth` | 收益走势 |

## 代码格式

```
SH600519    上交所     贵州茅台         AAPL    美股    苹果
SZ000858    深交所     五粮液           01810   港股    小米
SZ300750    创业板     宁德时代         110011  基金    易方达中小盘
```

## Agent 工作流

```bash
# 早盘简报
snowball market && snowball live --important --count 10 && snowball trending --count 5

# 个股深度研究
snowball quote SH600519 --detail
snowball income SH600519 --count 8
snowball indicator SH600519 --count 8
snowball holders SH600519 --top
snowball flow SH600519 --history

# 大 V 舆情
snowball kol SH600519 --count 10       # 找到相关大 V
snowball user <ID> --count 10          # 看最近发帖
snowball profile <ID>                  # 查看资质

# jq 过滤
snowball quote SH600519 | jq '.[0].current'
snowball trending | jq '.[].author'
```

## 登录原理

```
snowball login
  │
  ├─ 查找 Chrome/Chromium（CHROME_PATH > --chrome > 自动检测）
  ├─ 启动浏览器（后台运行，VPS 上自动无头）→ 打开 xueqiu.com → 通过 WAF
  ├─ 调用雪球 API → 生成二维码 → 终端渲染
  ├─ 等待扫码 → 每 2.5 秒轮询状态
  ├─ 过期？ → 自动刷新（最多 3 次）
  ├─ 全部失败？ → 降级为 Chrome 窗口手动扫码
  └─ 成功 → 保存 Cookie 到 ~/.snowball-cli/token.json
```

浏览器检测顺序：`CHROME_PATH` 环境变量 → `--chrome` 参数 → Chrome → Chromium → 平台默认路径

自动无头：Linux 上没有 `DISPLAY` 时，Chrome 自动以 `--headless` 模式启动。

## 无头服务器 / VPS 部署

不需要浏览器 — 从本地机器传输 token：

```bash
# 一行搞定：本地导出，VPS 导入
ssh vps "snowball import $(snowball export)"

# 或者分步
snowball export                    # 本地打印 base64
ssh vps "snowball import <base64>" # VPS 上粘贴
```

也可以在 VPS 上装 Chromium 直接扫码登录：

```bash
# Debian/Ubuntu
apt install -y chromium-browser
snowball login    # 自动检测无头模式，二维码在 SSH 终端显示

# 指定路径
snowball login --chrome /snap/bin/chromium
```

## Docker / OpenClaw 集成

在 Docker 容器或 AI Agent 平台（OpenClaw 等）中没有浏览器：

**新镜像：**

```dockerfile
FROM oven/bun:latest
RUN bun add -g snowball-cli
```

**已运行的容器**（如 OpenClaw，持久化目录 `/home/node/.openclaw`）：

```bash
# 在 OpenClaw 持久化目录中安装 bun + snowball-cli
docker exec <容器> bash -c "
  export BUN_INSTALL=/home/node/.openclaw/.bun
  curl -fsSL https://bun.sh/install | bash
  /home/node/.openclaw/.bun/bin/bun add -g snowball-cli
"

# 从宿主机导入 token
docker exec <容器> /home/node/.openclaw/.bun/bin/snowball import $(snowball export)
```

全部装在 `/home/node/.openclaw/` 下，容器重启不丢。

**作为 AgentSkill 安装**（在容器内或宿主机挂载的 workspace 目录中）：

```bash
cd /home/node/.openclaw/workspace    # 或宿主机上的挂载路径
bunx skills add https://github.com/baixianger/snowball-cli
```

## 协议

MIT
