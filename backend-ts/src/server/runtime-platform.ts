import type { RuntimeSettings } from './contracts.js';
import type { PlatformName } from './platform-contracts.js';
import { resolvePlatformEffectiveEnabled } from '../platforms/control-state.js';
import { resolvePlatformAdapter } from '../platforms/registry.js';

export function normalizePublishMode(mode: string): string {
  return mode.trim().toLowerCase();
}

export function defaultIsPlatformEnabled(platform: PlatformName, settings: RuntimeSettings): boolean {
  return resolvePlatformEffectiveEnabled(resolvePlatformAdapter(platform).isEnabled(settings), platform);
}

export function defaultGetPlatformPublishSource(platform: PlatformName, settings: RuntimeSettings): string {
  return resolvePlatformAdapter(platform).resolvePublishSource(settings);
}
