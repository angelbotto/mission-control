# Mission Control — Deployment Guide

## Overview

Mission Control uses a two-track deployment model:

| Track | Trigger | Where | Script |
|---|---|---|---|
| **CI (GitHub Actions)** | Every push/PR | GitHub cloud | `.github/workflows/ci.yml` |
| **Local Deploy** | Manual or webhook | Mac (localhost:3001) | `scripts/deploy.sh` |
| **Auto-deploy webhook** | GitHub push → webhook | Nexo runs it | `scripts/deploy-webhook.js` |

---

## CI — GitHub Actions

On every push to `main` or `develop`, and on every PR:

1. Install dependencies (`npm ci`)
2. Run tests (`npm run test:ci`)
3. Type check (`tsc --noEmit`)
4. Build (`npm run build`)
5. Upload build artifact (retained 7 days)

This catches broken builds before they reach production.

---

## Local Deploy (Manual)

```bash
# Dev mode (hot reload, port 3001)
./scripts/deploy.sh

# Production mode (optimized build)
./scripts/deploy.sh --prod
```

The script:
1. `git pull --rebase origin main`
2. `npm ci`
3. `rm -rf .next` (clear cache)
4. `npm run test:ci`
5. `npm run build`
6. Kills existing server on port 3001
7. Restarts server (dev or prod mode)

---

## Auto-Deploy via Webhook (Nexo's job)

### Setup

1. Start the webhook server (Nexo should run this as a background service):

```bash
WEBHOOK_SECRET=<secret> WEBHOOK_PORT=9001 node scripts/deploy-webhook.js
```

2. Configure GitHub webhook:
   - Go to: https://github.com/angelbotto/mission-control/settings/hooks
   - Add webhook:
     - Payload URL: `http://<your-ip>:9001/webhook`
     - Content type: `application/json`
     - Secret: `<same as WEBHOOK_SECRET>`
     - Events: push only

### How it works

```
Push to main → GitHub sends webhook → deploy-webhook.js receives →
verifies signature → triggers deploy.sh → MC restarts with latest code
```

---

## Cache Clearing

The deploy script always runs `rm -rf .next` before building. This ensures:
- No stale compiled pages
- No cached route handlers
- Fresh type-checking output

---

## Rollback

```bash
cd /Users/angelbotto/.openclaw/workspace-coder/mission-control
git log --oneline -10    # find last known-good commit
git checkout <hash>      # switch to it
./scripts/deploy.sh      # rebuild + restart
```

---

## Logs

```bash
tail -f /tmp/mc-server.log   # server stdout/stderr
```
