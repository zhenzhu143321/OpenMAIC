# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **User authentication & role permissions** — admin / teacher / student roles, status management (`active`, `pending_review`, `disabled`), login/register/logout/me APIs, admin user management page, middleware login gate, and per-route server authorization.
- **Course-first publishing workflow** — chapter-based courses, classroom binding, draft/published status, read-only public course view mode, and homepage separation between published courses and standalone classrooms.
- **QNAIGC / Qiniu Cloud media support** — QNAIGC TTS provider with 38 built-in voices and QNAIGC image generation provider backed by `gemini-3.1-flash-image-preview`.
- **Operational runbooks** — standalone 8002 startup SOP, media backfill script usage, and refreshed deploy/auth documentation.

### Changed

- **Server-side classroom model** now persists `ownerId` and `visibility`, enabling course-bound/public/private access patterns.
- **Course store/API contract** now consistently uses `{ success, course/courses }` envelopes.
- **Documentation set refreshed** to reflect auth, course publishing, standalone deployment, and new provider support.

### Fixed

- **Published classroom playback reliability** — fixed prefill/media race conditions and added loading indicators for classroom load and pre-playback resource preparation.
- **HTTP deployment auth cookie behavior** — `AUTH_COOKIE_SECURE` can now be disabled safely for plain-HTTP internal deployments.
- **Role-aware UI visibility** — hidden course creation / deletion actions for students and unapproved teachers, including the empty-state create button.
- **Cold-start i18n behavior** — loading overlays now respect the persisted locale without flashing the wrong language.

## [0.1.0] - 2026-03-26

The first tagged release of OpenMAIC, including all improvements since the initial open-source launch.

### Highlights

- **Discussion TTS** — Voice playback during discussion phase with per-agent voice assignment, supporting all TTS providers including browser-native [#211](https://github.com/THU-MAIC/OpenMAIC/pull/211)
- **Immersive Mode** — Full-screen view with speech bubbles, auto-hide controls, and keyboard navigation [#195](https://github.com/THU-MAIC/OpenMAIC/pull/195) (by @YizukiAme)
- **Discussion buffer-level pause** — Freeze text reveal without aborting the AI stream [#129](https://github.com/THU-MAIC/OpenMAIC/pull/129) (by @YizukiAme)
- **Keyboard shortcuts** — Comprehensive roundtable controls: T/V/Esc/Space/M/S/C [#256](https://github.com/THU-MAIC/OpenMAIC/pull/256) (by @YizukiAme)
- **Whiteboard enhancements** — Pan, zoom, auto-fit [#31](https://github.com/THU-MAIC/OpenMAIC/pull/31), history and auto-save [#40](https://github.com/THU-MAIC/OpenMAIC/pull/40) (by @YizukiAme)
- **New providers** — ElevenLabs TTS [#134](https://github.com/THU-MAIC/OpenMAIC/pull/134) (by @nkmohit), Grok/xAI for LLM, image, and video [#113](https://github.com/THU-MAIC/OpenMAIC/pull/113) (by @KanameMadoka520)
- **Server-side generation** — Media and TTS generation on the server [#75](https://github.com/THU-MAIC/OpenMAIC/pull/75) (by @cosarah)
- **1.25x playback speed** [#131](https://github.com/THU-MAIC/OpenMAIC/pull/131) (by @YizukiAme)
- **OpenClaw integration** — Generate classrooms from Feishu, Slack, Telegram, and 20+ messaging apps [#4](https://github.com/THU-MAIC/OpenMAIC/pull/4) (by @cosarah)
- **Vercel one-click deploy** [#2](https://github.com/THU-MAIC/OpenMAIC/pull/2) (by @cosarah)

### Security

- Fix SSRF and credential forwarding via client-supplied baseUrl [#30](https://github.com/THU-MAIC/OpenMAIC/pull/30) (by @Wing900)
- Use resolved API key in chat route instead of client-sent key [#221](https://github.com/THU-MAIC/OpenMAIC/pull/221)

### Testing

- Add Vitest unit testing infrastructure [#144](https://github.com/THU-MAIC/OpenMAIC/pull/144)
- Add Playwright e2e testing framework [#229](https://github.com/THU-MAIC/OpenMAIC/pull/229)

### New Contributors

@YizukiAme, @nkmohit, @KanameMadoka520, @Wing900, @Bortlesboat, @JokerQianwei, @humingfeng, @tsinglua, @mehulmpt, @ShaojieLiu, @Rowtion
