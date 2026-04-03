<p align="center">
  <img src="https://raw.githubusercontent.com/baixianger/snowball-cli/main/logo.png" width="160" alt="Snowball CLI" />
</p>

<h1 align="center">Snowball CLI</h1>

<p align="center">
  <strong>雪球股票数据命令行工具 — 为 AI Agent 而生</strong><br/>
  <sub>30 条命令 | A 股、港股、美股、基金 | JSON 输出</sub>
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
npm install -g snowball-cli     # 或：bun add -g snowball-cli
```

> **VPS / Docker / OpenClaw？** 请看 [安装与授权指南](https://github.com/baixianger/snowball-cli/blob/main/docs/setup.zh-CN.md)。

## 快速开始

```bash
# 无需登录：
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

## 认证

| 命令 | 说明 |
|---|---|
| `snowball login` | 终端内二维码，用雪球 App 扫码 |
| `snowball login --manual` | 打开 Chrome 窗口扫码 |
| `snowball token <cookie>` | 粘贴 DevTools 中的 cookie |
| `snowball export` / `import <b64>` | 跨机器传输 token |
| `snowball status` | 验证 token 是否有效 |
| `snowball logout` | 删除 token |

设置 `CHROME_PATH` 或 `--chrome <路径>` 指定 Chrome/Chromium 位置。

## 命令速查

完整命令详解请看 [命令行参考](https://github.com/baixianger/snowball-cli/blob/main/docs/commands.zh-CN.md)。

### 行情

| 命令 | 说明 | 认证 |
|---|---|:---:|
| `snowball quote <代码> [代码...]` | 实时行情 | |
| `snowball quote <代码> --detail` | PE、PB、股息率、52 周高低 | * |
| `snowball pankou <代码>` | 盘口 / 买卖五档 | * |
| `snowball kline <代码> [--period day] [--count 120]` | K 线 | * |
| `snowball minute <代码>` | 分时图 | * |
| `snowball market` | 大盘指数总览 | |

### 财务 · 公司 · 资金

| 命令 | 说明 |
|---|---|
| `snowball income / balance / cashflow / indicator <代码>` | 财务报表 |
| `snowball business / forecast <代码>` | 营收构成 / 盈利预测 |
| `snowball company / holders / bonus / industry / org <代码>` | F10 公司资料 |
| `snowball flow / assort / margin / block <代码>` | 资金流向 |

### 社交与资讯

| 命令 | 说明 |
|---|---|
| `snowball trending [day\|week\|month]` | 热帖（大 V 观点） |
| `snowball live [--important]` | 7x24 快讯 |
| `snowball feed [分类]` | 信息流（headlines, today, a-shares, us, hk, funds） |
| `snowball hot [cn\|us\|hk\|global]` | 热门股票 |
| `snowball kol <代码>` | 个股大 V |
| `snowball user / profile / post <ID>` | 用户帖子 / 主页 / 单帖 |

### 搜索与基金

| 命令 | 说明 | 认证 |
|---|---|:---:|
| `snowball search / search-user <关键词>` | 搜索股票 / 用户 | * |
| `snowball screen [SH\|HK\|US]` | 选股器 | * |
| `snowball fund <代码> [--nav\|--growth]` | 基金详情 / 净值 / 收益 | |

## 代码格式

```
SH600519  上交所  贵州茅台      AAPL   美股    苹果
SZ000858  深交所  五粮液        01810  港股    小米
SZ300750  创业板  宁德时代      110011 基金    易方达中小盘
```

## Agent 工作流

```bash
# 早盘简报
snowball market && snowball live --important --count 10 && snowball trending --count 5

# 个股深度研究
snowball quote SH600519 --detail
snowball income SH600519 --count 8
snowball holders SH600519 --top
snowball flow SH600519 --history

# 大 V 舆情
snowball kol SH600519 --count 10
snowball user <ID> --count 10
snowball profile <ID>
```

## 登录原理

```
snowball login
  ├─ 查找 Chrome/Chromium（CHROME_PATH > --chrome > 自动检测）
  ├─ 启动浏览器（VPS 自动无头）→ xueqiu.com → 通过 WAF
  ├─ 调用 API 生成二维码 → 终端渲染
  ├─ 轮询扫码状态 → 过期自动刷新（3 次）
  ├─ 全失败 → 降级为 Chrome 窗口扫码
  └─ 保存 Cookie 到 ~/.snowball-cli/token.json
```

## 协议

MIT
