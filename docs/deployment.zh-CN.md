# 部署指南

## 本地桌面（macOS / Windows / Linux）

```bash
bun add -g snowball-cli
snowball login    # 终端内扫码，最简单
```

## VPS（无头服务器）

**方式 A：从本地导入 token（推荐，不需要浏览器）**

```bash
ssh vps "curl -fsSL https://bun.sh/install | bash && ~/.bun/bin/bun add -g snowball-cli"
ssh vps "~/.bun/bin/snowball import $(snowball export)"
```

**方式 B：VPS 上装 Chromium 直接登录**

```bash
ssh vps "apt install -y chromium-browser"
ssh vps "~/.bun/bin/snowball login"    # 自动无头模式，QR 在 SSH 终端显示
```

## Docker 容器

```bash
docker exec <容器> bash -c "
  curl -fsSL https://bun.sh/install | bash
  ~/.bun/bin/bun add -g snowball-cli
"
docker exec <容器> ~/.bun/bin/snowball import $(snowball export)
```

如需持久化，把 bun 装到挂载目录（见下方 OpenClaw 章节）。

## 自建 Docker 镜像

```dockerfile
FROM oven/bun:latest
RUN bun add -g snowball-cli
```

## OpenClaw

### 本机 OpenClaw

```bash
clawhub install baixianger/snowball-cli
```

### Docker OpenClaw

OpenClaw 持久化目录：`/home/node/.openclaw`

**Step 1：安装 bun + snowball-cli**

```bash
docker exec <容器> bash -c "
  export BUN_INSTALL=/home/node/.openclaw/.bun
  curl -fsSL https://bun.sh/install | bash
  /home/node/.openclaw/.bun/bin/bun add -g snowball-cli
"
```

**Step 2：从宿主机导入 token**

```bash
docker exec <容器> /home/node/.openclaw/.bun/bin/snowball import $(snowball export)
```

**Step 3：安装 AgentSkill**

```bash
docker exec <容器> bash -c "
  cd /home/node/.openclaw/workspace
  /home/node/.openclaw/.bun/bin/bunx skills add https://github.com/baixianger/snowball-cli
"
```

### VPS 上的 Docker（远程 OpenClaw）

```bash
# SSH 到 VPS，在 Docker 容器内安装
ssh vps "docker exec <容器> bash -c '
  export BUN_INSTALL=/home/node/.openclaw/.bun
  curl -fsSL https://bun.sh/install | bash
  /home/node/.openclaw/.bun/bin/bun add -g snowball-cli
'"

# 本地 → VPS → Docker 容器，一行导入 token
ssh vps "docker exec <容器> /home/node/.openclaw/.bun/bin/snowball import $(snowball export)"
```
