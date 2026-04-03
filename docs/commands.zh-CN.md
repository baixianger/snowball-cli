# 命令行详解

所有命令输出 JSON，可用 `jq` 过滤或直接在脚本中解析。

## 认证相关

### `snowball login`

终端内显示二维码，用雪球 App 扫码登录。自动查找 Chrome/Chromium 浏览器。

```bash
snowball login                         # 默认，二维码在终端显示
snowball login --manual                # 在 Chrome 窗口中扫码
snowball login --chrome /path/to/chrome # 指定浏览器路径
```

浏览器查找顺序：`CHROME_PATH` 环境变量 → `--chrome` 参数 → Chrome → Chromium → 平台默认路径。

VPS 上无 `DISPLAY` 时自动以 `--headless` 模式启动。二维码过期会自动刷新，最多 3 次。

### `snowball token <cookie>`

手动粘贴 cookie 字符串，从浏览器 DevTools 获取。

```bash
snowball token "xq_a_token=abc123def456; u=781234567890"
```

获取方式：Chrome → F12 → Application → Cookies → xueqiu.com → 复制 `xq_a_token` 和 `u` 的值。

### `snowball export` / `snowball import <base64>`

跨机器传输 token，用于 VPS、Docker 等没有浏览器的环境。

```bash
# 本地导出
snowball export                         # 输出 base64 字符串

# 远程导入
ssh vps "snowball import $(snowball export)"
docker exec <容器> snowball import $(snowball export)
```

### `snowball status`

检查 token 状态，自动调用雪球 API 验证是否仍然有效。

```bash
snowball status
# Token: chrome-qr, saved today — verifying... ✓ active
```

### `snowball logout`

删除本地保存的 token 文件 (`~/.snowball-cli/token.json`)。

---

## 行情数据

### `snowball quote <代码> [代码...]`

实时行情，**无需登录**。支持批量查询。

```bash
snowball quote SH600519                 # 单个
snowball quote SH600519 SZ000858 AAPL   # 批量
snowball quote SH600519 --detail        # 详细（PE、PB、股息率、52 周高低）需登录
```

### `snowball market`

大盘指数总览，**无需登录**。返回上证综指、深证成指、创业板指、沪深 300、上证 50、中证 500。

### `snowball pankou <代码>`

盘口数据：买卖五档价格和挂单量。

### `snowball kline <代码>`

K 线（蜡烛图）数据。

```bash
snowball kline SH600519                          # 日线，默认 120 根
snowball kline SH600519 --period week --count 52 # 周线，一年
snowball kline SH600519 --period 5m --count 48   # 5 分钟线
```

周期参数：`1m` `5m` `15m` `30m` `60m` `120m` `day` `week` `month` `quarter` `year`

### `snowball minute <代码>`

当日分时图数据，包含资金流向分解（大/中/小单）。

---

## 财务数据

所有财务命令支持 `--count N` 指定返回期数（默认 5）。

```bash
snowball income SH600519 --count 10     # 利润表，最近 10 期
snowball balance SH600519               # 资产负债表
snowball cashflow SH600519              # 现金流量表
snowball indicator SH600519             # 关键指标（ROE、毛利率等）
snowball business SH600519              # 营收构成（按业务/地区分拆）
snowball forecast SH600519              # 机构盈利预测
```

---

## 公司资料（F10）

```bash
snowball company SH600519               # 公司简介（经营范围、注册地等）
snowball holders SH600519               # 股东人数变化趋势
snowball holders SH600519 --top         # 十大股东
snowball bonus SH600519                 # 分红送转历史
snowball industry SH600519              # 行业分类 + 概念板块
snowball org SH600519                   # 机构持仓变动（季度）
```

---

## 资金流向

```bash
snowball flow SH600519                  # 日内资金流向
snowball flow SH600519 --history        # 历史每日资金流向
snowball assort SH600519                # 按单量分布（超大/大/中/小单）
snowball margin SH600519                # 融资融券数据
snowball block SH600519                 # 大宗交易明细
```

---

## 社交与资讯

### `snowball trending [day|week|month]`

热帖排行，按时间维度。默认 `day`。

```bash
snowball trending                       # 今日热帖
snowball trending week --count 20       # 本周热帖
snowball trending month                 # 本月热帖
```

### `snowball live`

7x24 小时实时快讯。

```bash
snowball live                           # 全部快讯
snowball live --important               # 仅重要快讯（带标记的）
snowball live --count 5                 # 最新 5 条
```

### `snowball feed [分类]`

分类信息流。

```bash
snowball feed                           # 头条（默认）
snowball feed today                     # 今日话题
snowball feed a-shares --count 30       # 沪深
snowball feed us                        # 美股
snowball feed hk                        # 港股
snowball feed funds                     # 基金
snowball feed private                   # 私募
```

### `snowball hot [市场]`

热门股票排行。

```bash
snowball hot                            # A 股（默认）
snowball hot us                         # 美股
snowball hot hk                         # 港股
snowball hot global                     # 全球
```

### `snowball kol <代码>`

查找讨论某只股票的大 V / KOL。

```bash
snowball kol SH600519 --count 20        # 讨论茅台的大 V
```

### `snowball user <用户ID>`

指定用户的最新帖子。

```bash
snowball user 8586152406 --count 10     # 钟本聪Dylan 的最近 10 条
```

### `snowball profile <用户ID>`

用户主页信息：简介、粉丝数、认证状态等。

### `snowball post <帖子ID>`

单条帖子详情，通过帖子 ID 获取。

---

## 搜索与发现

```bash
snowball search 茅台                    # 搜索股票
snowball search-user 价投 --count 10    # 搜索用户
snowball screen                         # 选股器（默认沪市）
snowball screen HK --count 50           # 港股选股
snowball screen US                      # 美股选股
```

---

## 基金（无需登录）

通过蛋卷 API，**无需登录**。

```bash
snowball fund 110011                    # 基金详情（持仓、费率等）
snowball fund 110011 --nav              # 净值历史
snowball fund 110011 --growth           # 收益走势
```

---

## 代码格式

| 格式 | 市场 | 示例 |
|---|---|---|
| `SH600519` | 上交所 | 贵州茅台 |
| `SZ000858` | 深交所主板 | 五粮液 |
| `SZ300750` | 创业板 | 宁德时代 |
| `SH000001` | 上证指数 | 上证综指 |
| `SZ399001` | 深证指数 | 深证成指 |
| `AAPL` | 美股 | 苹果 |
| `01810` | 港股 | 小米 |
| `110011` | 基金 | 易方达中小盘 |
