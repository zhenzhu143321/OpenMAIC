#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/.deploy-backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
TMUX_SESSION="openmaic-svc-8002"
HEALTH_URL="http://127.0.0.1:8002/api/health"

cd "$ROOT_DIR"

echo "[deploy] commit: $(git rev-parse --short HEAD) branch: $(git rev-parse --abbrev-ref HEAD)"

# 1. Backup current standalone (if exists)
mkdir -p "$BACKUP_DIR"
if [[ -d .next/standalone ]]; then
  tar --exclude='.next/standalone/node_modules' \
      -czf "$BACKUP_DIR/standalone-$STAMP.tar.gz" \
      .next/standalone .next/static public 2>/dev/null || true
  echo "[deploy] backup -> $BACKUP_DIR/standalone-$STAMP.tar.gz"
fi

# 2. Keep only last 5 backups
ls -1t "$BACKUP_DIR"/standalone-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f

# 3. Build
pnpm install --frozen-lockfile
pnpm build

# 4. Restart tmux session
tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true
tmux new-session -d -s "$TMUX_SESSION" "./scripts/start-8002.sh >>/tmp/openmaic-8002.log 2>&1"

# 5. Health check (wait up to 30s)
for i in {1..30}; do
  if curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
    echo "[deploy] OK (after ${i}s)"
    exit 0
  fi
  sleep 1
done

echo "[deploy] FAILED health check; check /tmp/openmaic-8002.log" >&2
echo "[deploy] run ./scripts/rollback.sh to revert" >&2
exit 1
