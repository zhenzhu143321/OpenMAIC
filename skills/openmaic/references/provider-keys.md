# Provider Keys

## Critical Boundary

OpenMAIC generation does **not** automatically reuse the OpenClaw agent's current model or API key.

OpenMAIC server APIs resolve their own providers and secrets from OpenMAIC server-side config.

Do not rely on runtime overrides for:
- model
- provider
- API key
- base URL
- provider type

If the user wants to change any of those, they must update OpenMAIC server-side config.

## Interaction Policy

- Do not begin by asking the user to paste an API key into chat.
- First recommend a provider path.
- Then ask which config file they want to edit.
- The user should edit `.env.local` or `server-providers.yml` themselves.
- Do not offer to write the secret for them.
- Do not ask for the literal key in chat.
- If generation fails due to auth/provider/model config, direct the user back to the server-side config file.

## Auth Prerequisite for Local Setup

If the user is running OpenMAIC locally for the first time, remind them that current builds also expect auth config for full teacher/admin flows:

```env
AUTH_SECRET=<openssl rand -hex 32>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<set a password>
```

Without this, bootstrap admin login may fail on a fresh instance.

## Preferred User Flow

1. Recommend a provider option.
2. Ask where the user wants to configure it:
   - `.env.local` (recommended)
   - `server-providers.yml`
3. Tell the user exactly which keys to edit.
4. Wait for confirmation before continuing.

## Recommendation Paths

### 1. Lowest-Friction LLM Setup

Recommended when the user wants the simplest path.

```env
GOOGLE_API_KEY=...
DEFAULT_MODEL=google:gemini-3-flash-preview
```

Why:
- strong quality / speed balance
- matches the repo's current default recommendation
- works well for classroom generation

### 2. Alternative LLM Paths

Use when the user already prefers another provider.

Examples:

```env
OPENAI_API_KEY=sk-...
DEFAULT_MODEL=openai:gpt-4o-mini
```

```env
ANTHROPIC_API_KEY=sk-ant-...
DEFAULT_MODEL=anthropic:claude-3-5-haiku-20241022
```

```env
QN_API_KEY=...
DEFAULT_MODEL=qn:gemini-3.1-pro-preview
```

### 3. TTS / Image Add-Ons

If the user wants server-side voice or image generation, point them at the matching server-side keys.

Examples:

```env
TTS_QNAIGC_API_KEY=...
IMAGE_QNAIGC_API_KEY=...
```

Current built-in categories:
- **TTS**: OpenAI, Azure, GLM, Qwen, QNAIGC
- **Image**: Seedream, Qwen Image, Nano Banana, QNAIGC Image
- **Video**: Seedance, Kling, Veo, Sora
- **PDF**: unpdf, MinerU

## Model String Rule

When recommending `DEFAULT_MODEL`, always include the provider prefix:

- `google:gemini-3-flash-preview`
- `anthropic:claude-3-5-haiku-20241022`
- `openai:gpt-4o-mini`
- `qn:gemini-3.1-pro-preview`

Do **not** recommend bare model IDs such as `gemini-3-flash-preview`, because OpenMAIC will otherwise parse them as OpenAI models.

## Preferred Config Method

For first setup, prefer `.env.local`:

```bash
cp .env.example .env.local
```

Then edit the chosen keys.

Alternative: `server-providers.yml`

```yaml
providers:
  google:
    apiKey: ...

  anthropic:
    apiKey: sk-ant-...

  openai:
    apiKey: sk-...
```

If using Google or another non-default provider for classroom generation, also set `DEFAULT_MODEL` explicitly.

## Recommended Prompts To The User

Preferred:
- "I recommend configuring OpenMAIC through `.env.local` first. Please edit that file locally and tell me when you're done."
- "For the simplest setup, I recommend Google plus `DEFAULT_MODEL=google:gemini-3-flash-preview`. Do you want to configure that in `.env.local` or `server-providers.yml`?"

Avoid as the first move:
- "Send me your API key"
- "Paste your API key here"
- "Do you want me to write the key for you?"

## Confirmation Requirements

- Recommend one provider path first.
- Ask which config-file path the user wants.
- Instruct the user to modify the file themselves.
- Wait for confirmation before continuing.
- Do not request the literal key.
