---
name: snowball-cli
description: 雪球股票数据命令行工具。当用户需要查询中国 A 股、港股、美股行情，查看上市公司财报、资金流向、股东信息，浏览雪球大 V 观点、热帖、实时快讯，或者做基金净值查询时，使用此技能。触发词包括：雪球、A股、港股、沪深、茅台、宁德时代、SH600519、SZ300750、基金净值、KOL、热帖、大 V、选股、K线、盘口、利润表、资产负债表、资金流向、大宗交易、融资融券。即使用户只是说「茅台现在多少钱」「今天市场怎么样」「张坤最近说了什么」也应该使用此技能。
---

# Snowball CLI — 雪球数据命令行工具

封装雪球 (xueqiu.com) API，所有输出为 JSON 格式，专为 AI Agent 和脚本设计。

覆盖范围：A 股（沪深）、港股、美股（经雪球）、公募基金（经蛋卷）。

## 重要：先用再登录

**不要一上来就让用户登录。** 以下命令无需登录即可使用：

```bash
snowball quote SH600519              # 实时行情
snowball market                      # 大盘指数
snowball fund 110011                 # 基金详情
snowball fund 110011 --nav           # 基金净值
snowball fund 110011 --growth        # 基金收益
```

只有当命令返回「Not logged in」错误时，再引导用户登录。先 `snowball status` 检查是否已有 token。

## 安装

```bash
npm install -g snowball-cli          # 或
bun add -g snowball-cli
```

## 登录（仅在需要时）

大部分命令需要雪球登录态。上面列出的 `quote`、`market`、`fund` 无需登录。

遇到「Not logged in」错误时，提示用户自行完成登录。**不要代替用户执行认证命令。** 告知用户以下方式：

- `snowball login` — 用雪球 App 扫码登录（需要 Chrome/Chromium）
- `snowball export` / `snowball import <base64>` — 从已登录的机器导入 token

可以用 `snowball status` 检查当前 token 状态。

## 代码格式

| 格式 | 市场 | 示例 |
|---|---|---|
| `SHxxxxxx` | 上交所 | `SH600519`（贵州茅台） |
| `SZxxxxxx` | 深交所 | `SZ000858`（五粮液）、`SZ300750`（宁德时代） |
| `SH000xxx` | 上证指数 | `SH000001`（上证综指） |
| `SZ399xxx` | 深证指数 | `SZ399001`（深证成指） |
| `xxxxx` | 港股 | `01810`（小米） |
| `XXXX` | 美股 | `AAPL`（苹果） |

基金代码为纯数字：`110011`、`005827`。

## 命令参考

### 行情（quote 和 market 无需登录）

```bash
snowball quote SH600519                  # 实时行情
snowball quote SH600519 SZ000858 AAPL    # 批量查询
snowball quote SH600519 --detail         # PE、PB、股息率、52 周高低
snowball market                          # 大盘指数总览
snowball pankou SH600519                 # 盘口 / 买卖五档
snowball kline SH600519                  # 日 K 线，默认 120 根
snowball kline SH600519 --period week --count 52
snowball minute SH600519                 # 分时图
```

### 财务报表

```bash
snowball income SH600519 --count 10      # 利润表
snowball balance SH600519                # 资产负债表
snowball cashflow SH600519               # 现金流量表
snowball indicator SH600519              # 关键指标
snowball business SH600519               # 营收构成
snowball forecast SH600519               # 盈利预测
```

### 公司资料（F10）

```bash
snowball company SH600519                # 公司简介
snowball holders SH600519 --top          # 十大股东
snowball bonus SH600519                  # 分红送转
snowball industry SH600519               # 行业与概念
snowball org SH600519                    # 机构持仓变动
```

### 资金流向

```bash
snowball flow SH600519 --history         # 历史资金流向
snowball assort SH600519                 # 大/中/小单分布
snowball margin SH600519                 # 融资融券
snowball block SH600519                  # 大宗交易
```

### 社交与资讯

```bash
snowball trending day --count 10         # 今日热帖
snowball live --important                # 重要快讯
snowball feed a-shares                   # 沪深信息流
snowball hot cn                          # 热门 A 股
snowball kol SH600519                    # 个股大 V
snowball user <用户ID> --count 10        # 用户帖子
snowball profile <用户ID>               # 用户主页
snowball post <帖子ID>                  # 帖子详情
```

### 搜索与基金

```bash
snowball search 茅台                     # 搜索股票
snowball search-user 价投                # 搜索用户
snowball screen SH                       # 选股器
snowball fund 110011 --nav               # 基金净值（无需登录）
```

## Agent 工作流

### 早盘简报

```bash
snowball market
snowball live --important --count 10
snowball trending --count 5
```

### 个股研究

```bash
snowball quote SH600519 --detail
snowball income SH600519 --count 8
snowball indicator SH600519 --count 8
snowball holders SH600519 --top
snowball flow SH600519 --history
snowball forecast SH600519
```

### 大 V 舆情

```bash
snowball kol SH600519 --count 10
snowball user <ID> --count 10
snowball profile <ID>
```

## 认证要求速查

| 无需登录 | 需要登录 |
|---|---|
| `quote` `market` | `quote --detail` `pankou` `kline` `minute` |
| `fund` `fund --nav` `fund --growth` | 所有财务 / F10 / 资金 / 社交命令 |

## 常见问题

- **「Not logged in」** — `snowball login` 或 `snowball token <cookie>`
- **HTTP 403 / WAF** — 等几分钟或重新登录
- **Chrome not found** — 设置 `CHROME_PATH` 或 `--chrome`
- **Token 过期** — `snowball status` 检查，过期重新 `login`
