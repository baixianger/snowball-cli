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

需要 [Bun](https://bun.sh) 运行时。

```bash
cd /Users/baixianger/Desktop/omika.AI/snowball-cli
bun install
```

运行命令：`bun run index.ts <命令> [参数]`

全局安装后：`snowball <命令> [参数]`

## 登录（仅在需要时）

大部分命令需要雪球登录态（`xq_a_token`）。上面列出的 `quote`、`market`、`fund` 无需登录。

**登录方式（推荐顺序）：**

1. **二维码登录（默认）** — 终端内显示二维码，用雪球 App 扫码确认：
   ```bash
   snowball login
   ```
   原理：启动 Chrome → 访问 xueqiu.com 通过 WAF → 调用 API 生成二维码 → 终端渲染 → 轮询扫码状态 → 过期自动刷新（最多 3 次）→ 失败降级为手动模式。

2. **手动扫码** — 在 Chrome 窗口中扫码：
   ```bash
   snowball login --manual
   ```

3. **粘贴 Cookie** — 从浏览器开发者工具复制：
   ```bash
   snowball token "xq_a_token=xxx; u=xxx"
   ```

Token 保存在 `~/.snowball-cli/token.json`，通常有效数天。检查状态：
```bash
snowball status    # 显示来源、时间，自动验证是否仍然有效
```

## 代码格式

| 格式 | 市场 | 示例 |
|---|---|---|
| `SHxxxxxx` | 上交所 | `SH600519`（贵州茅台） |
| `SZxxxxxx` | 深交所 | `SZ000858`（五粮液）、`SZ300750`（宁德时代） |
| `SH000xxx` | 上证指数 | `SH000001`（上证综指）、`SH000300`（沪深300） |
| `SZ399xxx` | 深证指数 | `SZ399001`（深证成指）、`SZ399006`（创业板指） |
| `xxxxx` | 港股 | `01810`（小米）、`00700`（腾讯） |
| `XXXX` | 美股 | `AAPL`（苹果）、`TSLA`（特斯拉） |

基金代码为纯数字：`110011`、`005827`。

## 命令参考

### 行情数据（quote 和 market 无需登录）

```bash
snowball quote SH600519                  # 实时行情（无需登录）
snowball quote SH600519 SZ000858 AAPL    # 批量查询
snowball quote SH600519 --detail         # 详细：PE、PB、股息率、52 周高低
snowball market                          # 大盘指数总览（无需登录）
snowball pankou SH600519                 # 盘口 / 买卖五档
snowball kline SH600519                  # 日 K 线，默认 120 根
snowball kline SH600519 --period week --count 52   # 周线一年
snowball minute SH600519                 # 分时图
```

K 线周期：`1m` `5m` `15m` `30m` `60m` `120m` `day` `week` `month` `quarter` `year`

### 财务报表

```bash
snowball income SH600519                 # 利润表（默认最近 5 期）
snowball balance SH600519 --count 10     # 资产负债表（最近 10 期）
snowball cashflow SH600519               # 现金流量表
snowball indicator SH600519              # 关键指标（ROE、毛利率等）
snowball business SH600519               # 营收构成（按业务/地区分拆）
snowball forecast SH600519               # 机构盈利预测
```

### 公司资料（F10）

```bash
snowball company SH600519                # 公司简介
snowball holders SH600519                # 股东人数变化
snowball holders SH600519 --top          # 十大股东
snowball bonus SH600519                  # 分红送转历史
snowball industry SH600519               # 行业与概念板块
snowball org SH600519                    # 机构持仓变动
```

### 资金流向

```bash
snowball flow SH600519                   # 日内资金流向
snowball flow SH600519 --history         # 历史每日资金流向
snowball assort SH600519                 # 按单量分布（大/中/小单）
snowball margin SH600519                 # 融资融券数据
snowball block SH600519                  # 大宗交易
```

### 社交与资讯

```bash
snowball trending                        # 今日热帖
snowball trending week --count 20        # 本周热帖
snowball trending month                  # 本月热帖
snowball live                            # 7x24 实时快讯
snowball live --important                # 仅重要快讯
snowball feed                            # 头条信息流
snowball feed a-shares --count 30        # 沪深信息流
snowball hot                             # 热门股票（默认 A 股）
snowball hot us                          # 热门美股
snowball kol SH600519                    # 讨论该股的大 V
snowball user <用户ID> --count 20        # 指定用户最新帖子
snowball profile <用户ID>               # 用户主页信息
snowball post <帖子ID>                  # 单条帖子详情
```

信息流分类：`headlines`（头条）`today`（今日话题）`a-shares`（沪深）`us`（美股）`hk`（港股）`funds`（基金）`private`（私募）

### 搜索与发现

```bash
snowball search 茅台                     # 搜索股票
snowball search-user 价投 --count 10     # 搜索用户
snowball screen                          # 选股器（默认沪市）
snowball screen HK --count 50            # 港股选股
```

### 基金（经蛋卷 API，无需登录）

```bash
snowball fund 110011                     # 基金详情
snowball fund 110011 --nav               # 净值历史
snowball fund 110011 --growth            # 收益走势
```

## 输出格式

所有命令输出 JSON，用 `jq` 过滤：

```bash
snowball quote SH600519 | jq '.[0].current'        # 当前价格
snowball kline SH600519 | jq '.item | length'       # K 线根数
snowball income SH600519 | jq '.[0].report_name'    # 最新报告期
snowball trending | jq '.[].author'                  # 热帖作者列表
```

## Agent 工作流

### 早盘简报

```bash
snowball market                                    # 指数快照
snowball live --important --count 10               # 隔夜要闻
snowball hot cn                                    # 今日热门股
snowball trending --count 5                        # 社区热议
```

### 个股深度研究

```bash
snowball search 贵州茅台                            # 查找代码
snowball quote SH600519 --detail                   # 估值快照
snowball kline SH600519 --period week --count 104  # 两年周线
snowball income SH600519 --count 10                # 10 期利润表
snowball indicator SH600519 --count 10             # 关键财务指标
snowball business SH600519                         # 营收构成
snowball holders SH600519 --top                    # 十大股东
snowball org SH600519                              # 机构动向
snowball flow SH600519 --history                   # 资金流向趋势
snowball forecast SH600519                         # 机构一致预期
```

### 大 V 舆情分析

```bash
snowball kol SH600519 --count 20                   # 找到讨论该股的大 V
snowball profile <大V的ID>                         # 查看大 V 资质
snowball user <大V的ID> --count 20                 # 读最近发帖
snowball trending week                             # 本周社区热门话题
snowball search-user "价值投资" --count 10         # 搜索价投大 V
```

### 基金对比

```bash
snowball fund 110011                               # 易方达中小盘
snowball fund 110011 --growth                      # 收益走势
snowball fund 005827                               # 易方达蓝筹精选
snowball fund 005827 --growth                      # 收益走势
```

## 认证要求速查

| 无需登录 | 需要登录 |
|---|---|
| `quote`（基础行情） | `quote --detail` |
| `market` | `pankou` `kline` `minute` |
| `fund` `fund --nav` `fund --growth` | 所有财务报表命令 |
| | 所有公司资料 / F10 命令 |
| | 所有资金流向命令 |
| | 所有社交 / 资讯命令 |
| | `search` `search-user` `screen` |

## 常见问题

- **「Not logged in」** — 运行 `snowball login` 或 `snowball token <cookie>`
- **HTTP 403 / WAF** — 雪球反爬检测，等几分钟或重新登录刷新 Cookie
- **二维码过期** — CLI 会自动刷新，最多重试 3 次
- **API 报错** — 返回 `{ error_code, error_description }`，最常见原因是 token 过期
- **Token 一般有效数天**，批量操作前先 `snowball status` 确认
