import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PlatformName } from '../server/platform-contracts.js';

type PlatformControlState = {
  enabled: boolean;
  stage: 'trial' | 'paused';
  updatedAt: string;
};

const overrides = new Map<PlatformName, PlatformControlState>();
let hydrated = false;

function resolveControlStateFilePath(): string {
  const configured = String(process.env.PLATFORM_CONTROL_STATE_FILE ?? '').trim();
  if (configured) {
    return configured;
  }
  return fileURLToPath(new URL('../../.runtime/platform-control-state.json', import.meta.url));
}

function loadPersistedOverrides(): void {
  const filePath = resolveControlStateFilePath();
  if (!existsSync(filePath)) {
    hydrated = true;
    return;
  }

  try {
    const raw = readFileSync(filePath, 'utf8').trim();
    if (!raw) {
      hydrated = true;
      return;
    }

    const parsed = JSON.parse(raw) as Record<string, PlatformControlState>;
    overrides.clear();
    for (const [platform, state] of Object.entries(parsed)) {
      if (!state || typeof state !== 'object') {
        continue;
      }
      overrides.set(platform as PlatformName, {
        enabled: Boolean(state.enabled),
        stage: state.enabled ? 'trial' : 'paused',
        updatedAt: typeof state.updatedAt === 'string' && state.updatedAt ? state.updatedAt : new Date().toISOString(),
      });
    }
  } catch {
    overrides.clear();
  }

  hydrated = true;
}

function ensureHydrated(): void {
  if (!hydrated) {
    loadPersistedOverrides();
  }
}

function persistOverrides(): void {
  const filePath = resolveControlStateFilePath();
  if (overrides.size === 0) {
    rmSync(filePath, { force: true });
    return;
  }

  mkdirSync(dirname(filePath), { recursive: true });
  const payload = Object.fromEntries([...overrides.entries()].sort(([left], [right]) => left.localeCompare(right)));
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function getPlatformControlState(platform: PlatformName): PlatformControlState | null {
  ensureHydrated();
  return overrides.get(platform) ?? null;
}

export function setPlatformControlState(
  platform: PlatformName,
  input: { enabled: boolean; updatedAt?: string },
): PlatformControlState {
  ensureHydrated();
  const next: PlatformControlState = {
    enabled: input.enabled,
    stage: input.enabled ? 'trial' : 'paused',
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
  overrides.set(platform, next);
  persistOverrides();
  return next;
}

export function resolvePlatformEffectiveEnabled(baseEnabled: boolean, platform: PlatformName): boolean {
  ensureHydrated();
  const override = overrides.get(platform);
  if (!override) return baseEnabled;
  if (!baseEnabled) return false;
  return override.enabled;
}

export function resetPlatformControlState(platform?: PlatformName): void {
  ensureHydrated();
  if (platform) {
    overrides.delete(platform);
  } else {
    overrides.clear();
  }
  persistOverrides();
}
