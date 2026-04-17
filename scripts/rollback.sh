#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/.deploy-backups"
TMUX_SESSION="openmaic-svc-8002"

cd "$ROOT_DIR"

TARGET="${1:-$(ls -1t "$BACKUP_DIR"/standalone-*.tar.gz 2>/dev/null | head -1)}"
if [[ -z "$TARGET" || ! -f "$TARGET" ]]; then
  echo "[rollback] no backup found in $BACKUP_DIR" >&2
  echo "[rollback] usage: $0 [path/to/standalone-YYYYMMDD-HHMMSS.tar.gz]" >&2
  exit 1
fi

echo "[rollback] restoring $TARGET"
rm -rf .next/standalone .next/static
tar -xzf "$TARGET"

tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true
tmux new-session -d -s "$TMUX_SESSION" "./scripts/start-8002.sh >>/tmp/openmaic-8002.log 2>&1"

for i in {1..30}; do
  if curl -fsS --max-time 2 http://127.0.0.1:8002/api/health >/dev/null 2>&1; then
    echo "[rollback] OK"
    exit 0
  fi
  sleep 1
done

echo "[rollback] FAILED health check" >&2
exit 1
