# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Development server on :3000
pnpm build        # Production build (standalone output)
pnpm start        # Start production server (use scripts/start-8002.sh for port 8002)
pnpm lint         # ESLint
pnpm check        # Prettier check
pnpm format       # Prettier format
```

**Note:** `pnpm install` and `pnpm build` require the proxy (`export http_proxy="http://127.0.0.1:17891" https_proxy="http://127.0.0.1:17891"`) for downloading packages from overseas registries.

### Production Service (Port 8002)

The deployed instance runs via standalone build on port 8002. Preferred startup:

```bash
tmux new-session -d -s openmaic-svc-8002 './scripts/start-8002.sh >>/tmp/openmaic-8002.log 2>&1'
```

After any server-side code change: `pnpm build` → kill session → re-launch.

Verify: `curl http://127.0.0.1:8002/api/health`

## Architecture Overview

Next.js 16 App Router + React 19 + TypeScript. State management via Zustand. Multi-agent orchestration via LangGraph.

### Key Data Flows

**Provider Configuration:**
```
.env.local / server-providers.yml
  → lib/server/provider-config.ts  (server-side, never exposes keys)
  → GET /api/server-providers       (metadata only)
  → lib/store/settings.ts           (Zustand, merged into providersConfig)
```

**Model Resolution (per API call):**
```
POST /api/chat { model: "qn:gemini-3.1-pro-preview" }
  → lib/server/resolve-model.ts    (parse modelString, fetch apiKey/baseUrl)
  → lib/ai/providers.ts getModel() (create @ai-sdk/* client by provider.type)
```

**Classroom Generation (two-stage pipeline):**
```
Stage 1: POST /api/generate/scene-outlines-stream  (SSE, LLM builds outline)
Stage 2: parallel per outline item:
  POST /api/generate/scene-content   → slides/quiz/interactive/pbl content
  POST /api/generate/scene-actions   → teacher actions (laser, spotlight, speech)
  POST /api/generate/agent-profiles  → agent personas
  POST /api/generate/tts             → audio synthesis
Stage 2.5 (client-side): generateMediaForOutlines() → image/video generation
```

Async API mode: `POST /api/generate-classroom` submits a job; poll `GET /api/generate-classroom/{jobId}` until `status: succeeded`.

### Core Modules

| Module | Purpose |
|--------|---------|
| `lib/ai/providers.ts` | PROVIDERS registry + `getModel()`. Supports openai/anthropic/google types plus any OpenAI-compatible endpoint |
| `lib/server/provider-config.ts` | Loads config from `server-providers.yml` + env vars; `LLM_ENV_MAP` maps env prefixes to provider IDs |
| `lib/server/resolve-model.ts` | Parses `"providerId:modelId"` strings; handles `DEFAULT_MODEL` fallback |
| `lib/generation/` | Two-stage pipeline: outline → scenes. `pipeline-runner.ts` orchestrates; `scene-generator.ts` generates per-scene content |
| `lib/orchestration/director-graph.ts` | LangGraph state machine for multi-agent classroom discussion |
| `lib/playback/` | State machine: idle → playing → live; drives scene transitions and agent turns |
| `lib/action/` | Executes 28+ action types (speech, whiteboard draw/write/shape, spotlight, laser, etc.) |
| `lib/server/classroom-storage.ts` | `persistClassroom`, `readClassroom`, `listClassrooms` — reads both new (`{id}/classroom.json`) and old (`{id}.json`) formats |
| `lib/server/media-storage.ts` | `saveMedia`, `getMediaPath`, `mediaExists` — atomic writes to `data/classrooms/{id}/media/` |

### Frontend Storage

- **Settings**: `localStorage` key `settings-storage` (Zustand persist)
- **Classroom data** (scenes, audio, media, chat): IndexedDB, database name `MAIC-Database`
- **Server-persisted classrooms**: `data/classrooms/{id}/` on the server

### Scene Types

| Type | Components |
|------|-----------|
| `slides` | `components/slide-renderer/` — canvas-based editor with ProseMirror text editing |
| `quiz` | `components/scene-renderers/` — single/multiple choice + short answer |
| `interactive` | `components/scene-renderers/` — sandboxed HTML simulations |
| `pbl` | Project-Based Learning with role selection and milestones |

### Adding a New LLM Provider

Requires changes to 4 files — see `CLAUDE_DEPLOY_GUIDE.md` §3 for the complete walkthrough:

1. `lib/types/provider.ts` — add to `BuiltInProviderId`
2. `lib/ai/providers.ts` — add entry to `PROVIDERS` object
3. `lib/server/provider-config.ts` — add prefix to `LLM_ENV_MAP`
4. `.env.local` — set `{PREFIX}_API_KEY` and `{PREFIX}_BASE_URL`

Models must be registered in `providers.ts` before referencing them via `*_MODELS` env var — otherwise the filter removes them.

### Workspace Packages

`packages/pptxgenjs` and `packages/mathml2omml` are local workspace packages rebuilt during `pnpm install` via `postinstall`. They are transpiled into the Next.js build via `transpilePackages` in `next.config.ts`.

### Proxy Notes

- LLM provider proxy is **per-provider** in `server-providers.yml` (`proxy: "http://127.0.0.1:17891"`) — only Google provider currently consumes this field.
- Web search (Tavily) proxy uses `HTTP_PROXY`/`HTTPS_PROXY` in `.env.local`.
- OpenAI/Anthropic-type providers do **not** support proxy forwarding in the current code.
