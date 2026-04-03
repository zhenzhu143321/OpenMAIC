import fs from 'fs';
import path from 'path';
import { createLogger } from '@/lib/logger';

const log = createLogger('RuntimeEnv');

let runtimeEnvLoaded = false;

export function resolveProjectRoot(): string {
  const explicitRoot = process.env.OPENMAIC_PROJECT_ROOT;
  if (explicitRoot) {
    return path.resolve(explicitRoot);
  }

  const cwd = process.cwd();
  const standaloneSuffix = `${path.sep}.next${path.sep}standalone`;
  if (cwd.endsWith(standaloneSuffix)) {
    return path.resolve(cwd, '..', '..');
  }

  return cwd;
}

export function ensureRuntimeEnvLoaded(): void {
  if (runtimeEnvLoaded) return;
  runtimeEnvLoaded = true;

  const projectRoot = resolveProjectRoot();
  const nodeEnv = process.env.NODE_ENV;
  const candidates = [
    nodeEnv ? `.env.${nodeEnv}.local` : null,
    '.env.local',
    nodeEnv ? `.env.${nodeEnv}` : null,
    '.env',
  ].filter((value, index, array): value is string => !!value && array.indexOf(value) === index);

  for (const filename of candidates) {
    const filePath = path.join(projectRoot, filename);
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      for (const line of raw.split(/\r?\n/u)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
        const separatorIndex = normalized.indexOf('=');
        if (separatorIndex <= 0) continue;

        const key = normalized.slice(0, separatorIndex).trim();
        if (!key || process.env[key] !== undefined) continue;

        let value = normalized.slice(separatorIndex + 1).trim();
        const quoted =
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"));
        if (quoted) {
          value = value.slice(1, -1);
        }

        process.env[key] = value;
      }
    } catch (error) {
      log.warn(`[RuntimeEnv] Failed to load ${filename}:`, error);
      continue;
    }
    log.info(`[RuntimeEnv] Loaded ${filename}`);
  }
}
