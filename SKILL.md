---
name: snowball-cli
description: 雪球股票数据命令行工具。当用户需要查询中国 A 股、港股、美股行情，查看上市公司财报、资金流向、股东信息，浏览雪球大 V 观点、热帖、实时快讯，或者做基金净值查询时，使用此技能。触发词包括：雪球、A股、港股、沪深、茅台、宁德时代、SH600519、SZ300750、基金净值、KOL、热帖、大 V、选股、K线、盘口、利润表、资产负债表、资金流向、大宗交易、融资融券。即使用户只是说「茅台现在多少钱」「今天市场怎么样」「张坤最近说了什么」也应该使用此技能。
compatibility: Requires Bun runtime and network access to xueqiu.com / stock.xueqiu.com / danjuanapp.com APIs. Login command uses Chrome/Chromium via CDP for QR code authentication (user-initiated only).
license: MIT
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

如果 `snowball` 命令不存在，提示用户安装 **Bun** 后再装 CLI。从 0.3.2 起这是不兼容变更：`snowball` 的 shebang 是 `#!/usr/bin/env bun`，构建目标也是 Bun，不能用 Node 跑（`console is not async iterable`）。

```bash
curl -fsSL https://bun.sh/install | bash
bun add -g snowball-cli
```

## 登录（仅在需要时）

大部分命令需要雪球登录态。上面列出的 `quote`、`market`、`fund` 无需登录。

遇到「Not logged in」错误时，先 `snowball status`。不要自己编造 cookie。

用户没有雪球 App 时，用手机号 + 短信验证码，不要走二维码。默认区号是中国 +86，丹麦号码加 `--area-code 45`。

有 TTY 时一条命令走完：

```bash
snowball login --phone 13800138000 --area-code 86
```

它会拉起 Chrome（没有 DISPLAY 时用 Xvfb），打开发码框，发出短信，然后提示 `请输入短信验证码:`。把用户回复的数字写进这个进程的 stdin。验证码错了会再提示，不要重新执行 `--phone`（雪球会限流「请求过于频繁」）。出现 GeeTest 时会打印 `CAPTCHA_REQUIRED=<png>` 并提示 `请输入点击坐标 (x,y;x,y):`，坐标是这张图的像素（左上角为原点），此时验证码窗口还开着。

没有 TTY，或你不能一直占着这个进程时，加上 `--no-wait`（stdin 被关掉时也会自动走这条）：

```bash
snowball login --phone 13800138000 --no-wait
```

短信发出后会话写在 `~/.snowball-cli/sms-login/session.json`（目录 `0700`，文件 `0600`），Chrome 和 Xvfb 会退出，stdout 有 `SMS_SENT=1`。向用户要到验证码之后：

```bash
snowball login --sms-code 123456
```

不要把验证码写进日志。如果交互进程在 `SMS_SENT=1` 之后被杀掉，同样用 `--sms-code`，不要重新发短信。验证码错了会打印 `SMS_CODE_REJECTED=1` 和 `SMS_ERROR=...`，会话还在，10 分钟内可以再交一次。

没有 TTY 时如果先出现 `CAPTCHA_REQUIRED=/path/captcha.png`，命令会退出且短信还没发。把图发给用户，拿到坐标后：

```bash
snowball login --captcha-click 120,80
```

这会打开一个**新的** GeeTest。坐标对不上新图时，用新打印的 `CAPTCHA_REQUIRED=` 再来一次。多个点用分号：`120,80;340,520`，最后一点通常是「确认」。

`LOGIN_OK=1` 表示已经拿到 `xq_is_login` 并写好 `token.json`。日志里的手机号是打码的（`138****8000`）。不要打印完整号码、验证码或 cookie。`snowball login --help` 只打印用法，不会启动 Chrome。

用户有雪球 App、更想扫码时，在 Linux 服务器上：

```bash
snowball login --qr-png /tmp/xueqiu-qr.png
```

命令会打印 `QR_PNG=/tmp/xueqiu-qr.png`，然后一直阻塞到用户扫码并在 App 里点「确认登录」（默认最多 10 分钟，可用 `--timeout <秒>` 改）。把这个 PNG 发到用户的手机聊天里，告诉对方用雪球 App 扫一扫并确认。二维码过期或大约 2 分钟没人确认时，CLI 会覆盖同一个文件并**再打印一行 `QR_PNG=`**，需要把新图再发一次。stdin 不是 TTY 时不要按回车，命令自己结束。

没有图形界面时，CLI 会用 Xvfb 启动真实 Chrome（无头模式过不了雪球 WAF）。Chrome 起不来时，CLI 已默认加 `--no-sandbox` 并清理 `~/.snowball-cli/chrome-profile` 里的 `Singleton*` 锁。仍失败就装 `xvfb` 和 Chrome/Chromium，或改用下面的导入方式。

其他方式：

- `snowball login` — 终端里显示二维码（有 TTY 时）
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

- **「Not logged in」** — 没有雪球 App 时用 `snowball login --phone <号码>`（无 TTY 加 `--no-wait`，再用 `--sms-code`）。有 App 时用 `snowball login --qr-png <文件>`。不要编造 cookie
- **HTTP 400 on query-qr-code-state** — 轮询必须打 `www.xueqiu.com`。apex 的 301 会让 fetch 丢掉 Cookie
- **HTTP 403 / WAF** — 等几分钟或重新登录。无头 Chrome 拿不到 WAF cookie，改用 Xvfb
- **Chrome failed to start** — Linux 需要 `--no-sandbox`（CLI 已加）并清掉 profile 里的 Singleton 锁；或设置 `CHROME_PATH` / `--chrome`
- **`console is not async iterable`** — 命令被 Node 执行了。用 Bun 安装并保证 `snowball` 走 `#!/usr/bin/env bun`
- **Token 过期** — `snowball status` 检查，过期重新 `login`
