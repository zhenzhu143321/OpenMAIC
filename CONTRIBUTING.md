# Contributing to OpenMAIC

Thank you for your interest in contributing to OpenMAIC.
This guide reflects the current codebase, including auth, course publishing, standalone deployment, and the latest provider matrix.

## How to Contribute

| Contribution type | What to do |
| --- | --- |
| **Bug fix** | Open a PR directly (link the issue if one exists) |
| **Feature extension** (provider, TTS, course flow, export, UI polish) | Open a PR directly if the change is scoped and backwards-compatible |
| **New feature / architecture change** | Start a [GitHub Discussion](https://github.com/THU-MAIC/OpenMAIC/discussions) or ask in [Discord](https://discord.gg/PtZaaTbH) first |
| **Large refactor** | Only with maintainer alignment first |
| **Documentation** | PRs welcome |
| **Security issue** | Use private vulnerability reporting, not a public issue |

## Claiming Issues

To avoid duplicate work, please **comment on an issue** before starting.

- If there is **no meaningful update within 1 day**, the issue may be reassigned.
- If you can no longer continue, leave a comment so someone else can take over.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.9.0
- [pnpm](https://pnpm.io/) >= 10
- copy `.env.example` to `.env.local`

If this host requires a proxy for package install/build:

```bash
export http_proxy="http://127.0.0.1:17891"
export https_proxy="http://127.0.0.1:17891"
```

## Local Setup

```bash
git clone https://github.com/THU-MAIC/OpenMAIC.git
cd OpenMAIC
pnpm install
cp .env.example .env.local
```

Edit `.env.local` with at least:

```env
# one LLM provider
GOOGLE_API_KEY=...
DEFAULT_MODEL=google:gemini-3-flash-preview

# auth (recommended for full local testing)
AUTH_SECRET=<openssl rand -hex 32>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me
```

Optional current built-in categories include:
- LLM: OpenAI, Anthropic, Google, DeepSeek, Qwen, Kimi, MiniMax, GLM, SiliconFlow, Doubao, QN
- TTS: OpenAI, Azure, GLM, Qwen, QNAIGC
- Image: Seedream, Qwen Image, Nano Banana, QNAIGC Image
- Video: Seedance, Kling, Veo, Sora
- PDF: unpdf, MinerU

### Start the app

Development mode:

```bash
pnpm dev
```

Production-like local mode:

```bash
pnpm build
PORT=3000 ./scripts/start-8002.sh
```

> For the long-running internal 8002 service, use the tmux workflow in [`RUNBOOK-8002.md`](RUNBOOK-8002.md).

## Development Workflow

1. Fork the repo and branch from `main`
   ```bash
   git checkout -b feat/your-feature main
   ```
2. Make focused changes
3. Test locally
4. Run the required checks
5. Open a PR against `main`

Branch naming:
- `feat/` — features
- `fix/` — bug fixes
- `docs/` — documentation
- `test/` — test-only work
- `chore/` — maintenance

## Before You Submit a PR

Run these checks locally:

```bash
pnpm format
pnpm lint
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

### Manual verification expectations

Before requesting review, verify the flows you touched. Examples:
- auth: login / register / role gating / admin approval
- course flow: create course / chapter bind / publish / public view mode
- classroom playback: media load / TTS / interactive scene layout
- provider work: settings panel + real connectivity test

Keep the PR in **Draft** until you have done this.

## PR Guidelines

- **Every PR must link to an issue** (`Fixes #123`, `Closes #456`, etc.)
- Keep PRs focused; avoid mixing unrelated changes
- Fill out the [PR template](.github/pull_request_template.md)
- Include screenshots or recordings for UI changes
- Ensure all user-facing strings are internationalized through `lib/i18n/`
- If you changed server-side runtime behavior, mention whether `RUNBOOK-8002.md`, `README`, or deploy docs were updated too

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <short description>
```

Examples:

```text
feat(auth): add admin user management page
fix(course): prevent empty-state create button for students
docs: refresh deploy and runbook docs
```

## AI-Assisted PRs

AI-assisted PRs are welcome, but the author remains responsible for the result.

Requirements:
- disclose that the PR is AI-assisted
- review the diff yourself before requesting maintainer review
- verify behavior locally instead of relying on generated code alone

## Project Structure

```text
OpenMAIC/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/                # ~31 route handlers (auth, admin, course, classroom, generate, tools)
│   ├── classroom/[id]/     # classroom playback
│   ├── course/             # course list + course detail pages
│   ├── login/              # login page
│   ├── register/           # register page
│   └── admin/              # admin user management
├── components/             # UI components
├── lib/                    # generation, playback, providers, storage, i18n, hooks
├── data/                   # JSON storage for users / courses / classrooms / jobs
├── docs/                   # plans, specs, internal review docs
├── scripts/                # operational scripts (e.g. start-8002, backfill-classroom-media)
├── skills/                 # OpenClaw / ClawHub skill files
├── packages/               # workspace packages (pptxgenjs, mathml2omml)
└── public/                 # logos and static assets
```

## Reporting Bugs

Use the [Bug Report](https://github.com/THU-MAIC/OpenMAIC/issues/new?template=bug_report.yml) template and include:
- steps to reproduce
- expected vs actual behavior
- browser / OS / Node version
- logs / screenshots where relevant

## Requesting Features

Use the [Feature Request](https://github.com/THU-MAIC/OpenMAIC/issues/new?template=feature_request.yml) template.
For larger changes, open a [Discussion](https://github.com/THU-MAIC/OpenMAIC/discussions) first.

## Security Vulnerabilities

Please report security issues via [GitHub Security Advisories](https://github.com/THU-MAIC/OpenMAIC/security/advisories/new).
Do **not** open a public issue for a security vulnerability.

## License

By contributing to OpenMAIC, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE).
