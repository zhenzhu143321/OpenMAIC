# Startup Modes

## Goal

Help the user choose how OpenMAIC should run before you start anything.

## Options

### 1. Development Mode

Recommended for first-time setup and fast debugging.

```bash
pnpm dev
```

Tradeoff:
- fastest feedback loop
- easiest to inspect logs and hot-reload UI changes
- not identical to the deployed standalone service

### 2. Production-Like Standalone Mode

Recommended when the user wants behavior closer to the deployed 8002 service.

```bash
pnpm build
PORT=3000 ./scripts/start-8002.sh
```

Tradeoff:
- closest to the real deployed startup path
- uses the same standalone server mechanics as port 8002
- slower to rebuild/restart than `pnpm dev`

> Do **not** recommend `pnpm start` here. This project's deployed runtime uses the standalone build helper script instead.

### 3. Docker Compose

Use only when the user explicitly wants containerized startup or wants to avoid local Node setup details.

```bash
docker compose up --build
```

Tradeoff:
- cleaner isolation
- heavier and slower
- harder to debug app-level issues quickly

## Recommendation Order

1. `pnpm dev`
2. `pnpm build && PORT=3000 ./scripts/start-8002.sh`
3. `docker compose up --build`

## Health Check

After startup, verify:

```bash
curl -fsS http://localhost:3000/api/health
```

If the skill config provides a custom `url`, use that instead.

## Confirmation Requirements

- Ask the user to choose one startup mode.
- Ask again before running the selected command.
