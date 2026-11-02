# Setup Guide — Install & Auth

## Local desktop (macOS / Windows / Linux)

```bash
curl -fsSL https://bun.sh/install | bash   # Bun is required; the snowball bin runs under Bun
bun add -g snowball-cli
snowball login    # QR in the terminal
```

## VPS (headless server)

**Option A: Import token from local (recommended, no browser needed)**

```bash
ssh vps "curl -fsSL https://bun.sh/install | bash && ~/.bun/bin/bun add -g snowball-cli"
ssh vps "~/.bun/bin/snowball import $(snowball export)"
```

**Option B: Install Chrome and Xvfb on the VPS and log in there**

Headless Chrome is blocked by Xueqiu's WAF (the page never issues `device_id`). With no `DISPLAY`, `snowball login` starts Xvfb and a real Chrome window (`--no-sandbox`, stale `Singleton*` locks cleared). Do not rely on `--headless`.

```bash
ssh vps "apt install -y xvfb google-chrome-stable"   # or: chromium-browser
ssh vps "~/.bun/bin/snowball login --qr-png /tmp/xueqiu-qr.png"
# prints QR_PNG=/tmp/xueqiu-qr.png and waits until the Xueqiu app confirms

# No Xueqiu app: phone + SMS. A TTY prompts for the code.
ssh vps "~/.bun/bin/snowball login --phone <number> --area-code 86"
# No TTY (or --no-wait): SMS_SENT=1, then finish from the saved session:
ssh vps "~/.bun/bin/snowball login --sms-code <code>"
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
