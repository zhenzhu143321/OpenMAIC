import { vi } from 'vitest';

// Prevent ensureRuntimeEnvLoaded from reading .env.local during tests.
// Real .env.local values would leak into process.env and break assertions
// that expect an empty provider config.
vi.mock('@/lib/server/runtime-env', () => ({
  ensureRuntimeEnvLoaded: () => {},
  resolveProjectRoot: () => process.cwd(),
}));
