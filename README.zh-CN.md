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

**不兼容变更：** 从 0.3.2 起，`snowball` 必须用 Bun 运行（`#!/usr/bin/env bun`，构建目标是 Bun）。不能再用 Node（会报 `console is not async iterable`）。没装 Bun 时 `npm install -g` 也起不来。

```bash
curl -fsSL https://bun.sh/install | bash
bun add -g snowball-cli
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
| `snowball login --qr-png <文件>` | 写出 PNG 并一直等到 App 确认（不用按回车）。给要把图片发到手机的 Agent 用 |
| `snowball login --phone <号码> [--area-code 86]` | 手机号 + 短信。提示 `请输入短信验证码:` 并在同一条命令里完成登录。默认区号 86，丹麦是 45 |
| `snowball login --phone <号码> --no-wait` | 发出短信后打印 `SMS_SENT=1` 并退出。stdin 不是 TTY 时也是这样 |
| `snowball login --sms-code <验证码>` | 用已保存的会话完成登录（`--no-wait`，或交互进程在发码后被杀掉） |
| `snowball login --captcha-click <x,y>` | 从保存的 GeeTest 继续，发出短信后退出。坐标是 PNG 里的像素 |
| `snowball login --timeout <秒>` | 二维码刷新或等待短信发出的时长，默认 600 |
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
snowball login [--qr-png <文件>]
  ├─ 查找 Chrome/Chromium（CHROME_PATH > --chrome > 自动检测）
  ├─ Linux：加上 --no-sandbox，并清掉 profile 里残留的 Singleton* 锁
  ├─ 没有 DISPLAY：用 Xvfb 开真实窗口（无头 Chrome 拿不到雪球 WAF cookie）
  ├─ 打开 www.xueqiu.com，读取 WAF cookie
  ├─ POST /snb/provider/generate-qr-code
  ├─ 终端二维码，和/或写 PNG（打印 QR_PNG=<路径>）
  ├─ GET https://www.xueqiu.com/snb/provider/query-qr-code-state
  │    （apex 域名会 301 到 www，fetch 跟着重定向时会丢掉 Cookie，于是 HTTP 400）
  ├─ 过期或约 2 分钟没人扫就换一张新二维码，直到 `--timeout`（默认 10 分钟）
  ├─ 一直等到 App 里点确认。stdin 不是 TTY，或用了 --qr-png 时，不需要按回车
  ├─ 关掉本次启动的 Xvfb
  └─ 保存 Cookie 到 ~/.snowball-cli/token.json（文件 0600，目录 0700）

snowball login --phone <号码> [--area-code 86] [--no-wait] [--timeout 600]
  ├─ Chrome / Xvfb 与扫码登录相同
  ├─ 打开 www.xueqiu.com 登录框（验证码登录）
  ├─ 勾选协议，填入手机号，点击发送验证码
  ├─ 有 TTY 且出现 GeeTest（available:1）时打印 CAPTCHA_REQUIRED=<png>
  │    并提示 请输入点击坐标 (x,y;x,y):，此时验证码窗口还开着
  ├─ 没有 TTY，或还没有坐标：保存会话后退出
  │    snowball login --captcha-click x,y 会重新打开验证码、发出短信并退出
  ├─ 短信发出后立刻写入 ~/.snowball-cli/sms-login/session.json（目录 0700，文件 0600）
  │    并关掉本次的 Chrome 和 Xvfb
  ├─ 有 TTY 时提示 请输入短信验证码:，然后 POST /snb/provider/login（SM4）
  │    验证码错了会再问一次，不会重新发短信
  ├─ 没有 TTY，或加了 --no-wait：打印 SMS_SENT=1 后退出
  │    snowball login --sms-code <验证码> 用保存的会话完成登录
  │    交互进程在短信发出后被杀掉，这条命令仍然有效
  ├─ 错误码 20099 会带 is_register=1 再提交一次
  ├─ 只有拿到 xq_is_login 才打印 LOGIN_OK=1，token.json 仍是 0600
  └─ 会话大约 10 分钟后过期。验证码错误不会删会话。
     不会打印完整手机号、验证码或 Cookie
```

## 协议

MIT
