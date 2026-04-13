# CLAUDE.md

This file provides guidance to Claude Code / coding agents working in this repository.

## Commands

```bash
pnpm dev                 # local dev server on :3000
pnpm build               # production build (standalone output)
./scripts/start-8002.sh  # start standalone server (defaults to :8002)
pnpm lint                # ESLint
pnpm test                # Vitest
pnpm exec tsc --noEmit   # TypeScript check
```

### Production Service (Port 8002)

The deployed 8002 instance must run from the **standalone build**.

Preferred detached startup:

```bash
cd /home/sunli/MyWork/myproject/OpenMAIC
tmux new-session -d -s openmaic-svc-8002 './scripts/start-8002.sh >>/tmp/openmaic-8002.log 2>&1'
```

After any server-side code change:

```bash
pnpm build
tmux kill-session -t openmaic-svc-8002 || true
tmux new-session -d -s openmaic-svc-8002 './scripts/start-8002.sh >>/tmp/openmaic-8002.log 2>&1'
```

Verify:

```bash
curl http://127.0.0.1:8002/api/health
```

### Proxy Note

On this host, `pnpm install` and sometimes `pnpm build` may need the local proxy:

```bash
export http_proxy="http://127.0.0.1:17891"
export https_proxy="http://127.0.0.1:17891"
```

## Architecture Overview

OpenMAIC is a Next.js 16 App Router app with React 19 + TypeScript + Zustand.
It combines:
- two-stage classroom generation
- LangGraph multi-agent orchestration
- JSON-file server storage
- role-based authentication and course publishing

### Auth & Permission Flow

```text
/login or /register
  → /api/auth/login | /api/auth/register
  → iron-session cookie (openmaic_session)
  → middleware.ts gates non-public routes
  → lib/server/auth-helpers.ts re-reads user JSON on each request
```

Roles / states in current code:
- `admin`
- `teacher`
- `student`
- status: `active`, `pending_review`, `disabled`

Important rule:
- `pending_review` teachers are treated as `student` for permission checks

### Course / Classroom Publishing Model

```text
Course
  → metadata + chapters[] + ownerId + status(draft/published)
  → each chapter optionally binds one server classroom

Classroom
  → data/classrooms/{id}/classroom.json
  → ownerId + visibility(private | course-bound | standalone-published)
```

Current behavior:
- active teachers/admins can create and manage courses
- courses publish at the **course level**, not by loose classroom list
- published courses are visible on the homepage and in view mode (`?mode=view`)
- standalone classrooms still exist and remain a separate concept from courses

### Generation Flow

```text
POST /api/generate/scene-outlines-stream   # outline generation (SSE)
POST /api/generate/scene-content           # scene content
POST /api/generate/scene-actions           # teacher actions / narration timing
POST /api/generate/agent-profiles          # agent personas
POST /api/generate/tts                     # TTS generation
POST /api/generate/image                   # image generation
POST /api/generate/video                   # video generation
POST /api/generate-classroom               # async server job wrapper
GET  /api/generate-classroom/[jobId]       # polling
```

### Key Storage Locations

- `data/users/` — auth users
- `data/courses/` — course metadata + chapters
- `data/classrooms/{id}/classroom.json` — persisted classroom data
- `data/classrooms/{id}/media/` — persisted media cache
- IndexedDB (`MAIC-Database`) — local browser draft classrooms and playback cache
- localStorage (`settings-storage`) — UI/provider settings

## Core Modules

| Module | Purpose |
| --- | --- |
| `lib/server/auth-helpers.ts` | `requireUser`, `requireRole`, `requireOwnership` |
| `lib/server/user-storage.ts` | user CRUD + bootstrap admin + bcrypt verification |
| `lib/server/course-storage.ts` | course persistence + migration helpers |
| `lib/server/classroom-storage.ts` | classroom persistence + visibility metadata |
| `lib/server/media-storage.ts` | media save/read/list helpers |
| `lib/server/provider-config.ts` | loads env/YAML provider config |
| `lib/server/resolve-model.ts` | resolves model/apiKey/baseUrl/proxy |
| `lib/generation/` | outline → scenes generation pipeline |
| `lib/orchestration/director-graph.ts` | LangGraph classroom discussion orchestration |
| `lib/playback/` | playback/live discussion state machine |
| `lib/audio/` | TTS providers + voice metadata |
| `lib/media/` | image/video provider adapters |
| `lib/i18n/` | zh-CN / en-US dictionaries |

## Provider Configuration

Provider config is server-side.

Sources:
- `.env.local`
- optional `server-providers.yml`

Current built-in categories:
- **LLM**: OpenAI, Anthropic, Google, DeepSeek, Qwen, Kimi, MiniMax, GLM, SiliconFlow, Doubao, QN
- **TTS**: OpenAI, Azure, GLM, Qwen, QNAIGC
- **ASR**: OpenAI, Qwen
- **Image**: Seedream, Qwen Image, Nano Banana, QNAIGC Image
- **Video**: Seedance, Kling, Veo, Sora
- **PDF**: unpdf, MinerU

Notes:
- `DEFAULT_MODEL` should always include the provider prefix, e.g. `google:gemini-3-flash-preview`
- QNAIGC TTS currently exposes **38** built-in voices in `lib/audio/constants.ts`
- QNAIGC image uses `gemini-3.1-flash-image-preview`
- provider proxy support in `getModel()` is effectively implemented for Google models; web-search/other fetchers may use `proxy-fetch` separately

## Known Operational Notes

- Do not use `pnpm start` for the 8002 service.
- Standalone mode changes `process.cwd()`; always use repo-root-aware server helpers.
- If published classrooms show media `404`, run:

```bash
node scripts/backfill-classroom-media.mjs <classroomId>
```

- Current known auth gap: `GET /api/classroom/media` requires login but does not yet fully enforce classroom visibility at the media layer.
