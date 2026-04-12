import type { PlatformName } from '../server/platform-contracts.js';

type PlatformControlState = {
  enabled: boolean;
  stage: 'trial' | 'paused';
  updatedAt: string;
};

const overrides = new Map<PlatformName, PlatformControlState>();

export function getPlatformControlState(platform: PlatformName): PlatformControlState | null {
  return overrides.get(platform) ?? null;
}

export function setPlatformControlState(
  platform: PlatformName,
  input: { enabled: boolean; updatedAt?: string },
): PlatformControlState {
  const next: PlatformControlState = {
    enabled: input.enabled,
    stage: input.enabled ? 'trial' : 'paused',
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
  overrides.set(platform, next);
  return next;
}

export function resolvePlatformEffectiveEnabled(baseEnabled: boolean, platform: PlatformName): boolean {
  const override = overrides.get(platform);
  if (!override) return baseEnabled;
  if (!baseEnabled) return false;
  return override.enabled;
}

export function resetPlatformControlState(platform?: PlatformName): void {
  if (platform) {
    overrides.delete(platform);
    return;
  }
  overrides.clear();
}
