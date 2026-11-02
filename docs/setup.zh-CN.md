# 安装与授权指南

## 本地桌面（macOS / Windows / Linux）

```bash
curl -fsSL https://bun.sh/install | bash   # 必须用 Bun，snowball 命令由 Bun 执行
bun add -g snowball-cli
snowball login    # 终端内扫码，最简单
```

## VPS（无头服务器）

**方式 A：从本地导入 token（推荐，不需要浏览器）**

```bash
ssh vps "curl -fsSL https://bun.sh/install | bash && ~/.bun/bin/bun add -g snowball-cli"
ssh vps "~/.bun/bin/snowball import $(snowball export)"
```

**方式 B：在 VPS 上装 Chrome 和 Xvfb，直接登录**

无头 Chrome 会被雪球 WAF 拦住（页面不发 `device_id`）。没有 `DISPLAY` 时，`snowball login` 会拉起 Xvfb 和真实 Chrome 窗口（带 `--no-sandbox`，并清掉残留的 `Singleton*` 锁）。不要依赖 `--headless`。

```bash
ssh vps "apt install -y xvfb google-chrome-stable"   # 或 chromium-browser
ssh vps "~/.bun/bin/snowball login --qr-png /tmp/xueqiu-qr.png"
# 打印 QR_PNG=/tmp/xueqiu-qr.png，然后一直等到雪球 App 里确认
```

## Docker 容器

装到容器内部默认路径，token 不暴露在宿主机上：

```bash
docker exec <容器> bash -c "
  curl -fsSL https://bun.sh/install | bash
  ~/.bun/bin/bun add -g snowball-cli
"
docker exec <容器> ~/.bun/bin/snowball import $(snowball export)
```

> 容器重建后需要重新安装和导入 token。

## 自建 Docker 镜像

```dockerfile
FROM oven/bun:latest
RUN bun add -g snowball-cli
```

运行时导入 token：

```bash
docker run -d --name myapp myimage
docker exec myapp snowball import $(snowball export)
```

## OpenClaw

### 本机 OpenClaw

```bash
clawhub install baixianger/snowball-cli
```

### Docker OpenClaw

装到容器内部，不放挂载目录，避免 token 泄露到宿主机：

**Step 1：安装 bun + snowball-cli**

```bash
docker exec <容器> bash -c "
  curl -fsSL https://bun.sh/install | bash
  ~/.bun/bin/bun add -g snowball-cli
"
```

**Step 2：导入 token**

```bash
docker exec <容器> ~/.bun/bin/snowball import $(snowball export)
```

**Step 3：安装 AgentSkill**

```bash
docker exec <容器> bash -c "
  cd ~/.openclaw/workspace
  ~/.bun/bin/bunx skills add https://github.com/baixianger/snowball-cli
"
```

> 容器重建后需要重新执行以上步骤。可以写成初始化脚本自动化。

### VPS 上的 Docker（远程 OpenClaw）

```bash
# 安装
ssh vps "docker exec <容器> bash -c '
  curl -fsSL https://bun.sh/install | bash
  ~/.bun/bin/bun add -g snowball-cli
'"

# 导入 token：本地 → VPS → Docker
ssh vps "docker exec <容器> ~/.bun/bin/snowball import $(snowball export)"
```
