#!/usr/bin/env bash
# Mission Control — Local Deploy Script
# Usage: ./scripts/deploy.sh [--prod]
#   --prod  : Build + run production server (next start)
#   default : Build + restart dev server (next dev -p 3001)

set -euo pipefail

MC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${MC_PORT:-3001}"
MODE="${1:-}"

echo "🚀 Mission Control Deploy — $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "   Dir : $MC_DIR"
echo "   Port: $PORT"
echo "   Mode: ${MODE:-dev}"

cd "$MC_DIR"

# 1. Pull latest from git
echo ""
echo "📥 Pulling latest changes..."
git pull --rebase origin main

# 2. Install deps if package-lock changed
echo ""
echo "📦 Checking dependencies..."
npm ci --prefer-offline

# 3. Clear Next.js cache
echo ""
echo "🧹 Clearing Next.js cache..."
rm -rf .next

# 4. Run tests
echo ""
echo "🧪 Running tests..."
npm run test:ci

# 5. Build
echo ""
echo "🔨 Building..."
npm run build

# 6. Restart server
echo ""
echo "♻️  Restarting server..."
# Kill existing process on port
if command -v lsof &>/dev/null; then
  OLD_PID=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
  [ -n "$OLD_PID" ] && kill -TERM "$OLD_PID" && echo "   Killed PID $OLD_PID" && sleep 1
fi

if [ "$MODE" = "--prod" ]; then
  nohup npm run start -- -p "$PORT" > /tmp/mc-server.log 2>&1 &
  echo "   ✅ Production server started on :$PORT (PID $!)"
else
  nohup npm run dev -- -p "$PORT" > /tmp/mc-server.log 2>&1 &
  echo "   ✅ Dev server started on :$PORT (PID $!)"
fi

echo ""
echo "🎯 Deploy complete! Mission Control is live at http://localhost:$PORT"
