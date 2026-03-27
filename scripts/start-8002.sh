#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

export OPENMAIC_PROJECT_ROOT="$ROOT_DIR"
export PORT="${PORT:-8002}"
export HOSTNAME="${OPENMAIC_HOSTNAME:-0.0.0.0}"

if [[ ! -f .next/standalone/server.js ]]; then
  echo "Missing standalone build: $ROOT_DIR/.next/standalone/server.js" >&2
  echo "Run 'pnpm build' first." >&2
  exit 1
fi

# Copy static assets (required for standalone mode)
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true

exec node .next/standalone/server.js
