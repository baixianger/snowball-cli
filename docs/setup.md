# Setup Guide — Install & Auth

## Local desktop (macOS / Windows / Linux)

```bash
bun add -g snowball-cli
snowball login    # QR in terminal, simplest
```

## VPS (headless server)

**Option A: Import token from local (recommended, no browser needed)**

```bash
ssh vps "curl -fsSL https://bun.sh/install | bash && ~/.bun/bin/bun add -g snowball-cli"
ssh vps "~/.bun/bin/snowball import $(snowball export)"
```

**Option B: Install Chromium on VPS and login there**

```bash
ssh vps "apt install -y chromium-browser"
ssh vps "~/.bun/bin/snowball login"    # auto-headless, QR in SSH terminal
```

## Docker container

```bash
docker exec <container> bash -c "
  curl -fsSL https://bun.sh/install | bash
  ~/.bun/bin/bun add -g snowball-cli
"
docker exec <container> ~/.bun/bin/snowball import $(snowball export)
```

For persistence, install bun into a mounted volume (see OpenClaw section below).

## Custom Docker image

```dockerfile
FROM oven/bun:latest
RUN bun add -g snowball-cli
```

## OpenClaw

### Local OpenClaw

```bash
clawhub install baixianger/snowball-cli
```

### Docker OpenClaw

OpenClaw persistent dir: `/home/node/.openclaw`

**Step 1: Install bun + snowball-cli**

```bash
docker exec <container> bash -c "
  export BUN_INSTALL=/home/node/.openclaw/.bun
  curl -fsSL https://bun.sh/install | bash
  /home/node/.openclaw/.bun/bin/bun add -g snowball-cli
"
```

**Step 2: Import token from host**

```bash
docker exec <container> /home/node/.openclaw/.bun/bin/snowball import $(snowball export)
```

**Step 3: Install AgentSkill**

```bash
docker exec <container> bash -c "
  cd /home/node/.openclaw/workspace
  /home/node/.openclaw/.bun/bin/bunx skills add https://github.com/baixianger/snowball-cli
"
```

### VPS + Docker (OpenClaw on remote server)

```bash
# Install inside Docker container on VPS
ssh vps "docker exec <container> bash -c '
  export BUN_INSTALL=/home/node/.openclaw/.bun
  curl -fsSL https://bun.sh/install | bash
  /home/node/.openclaw/.bun/bin/bun add -g snowball-cli
'"

# Import token: local → VPS → Docker container
ssh vps "docker exec <container> /home/node/.openclaw/.bun/bin/snowball import $(snowball export)"
```
