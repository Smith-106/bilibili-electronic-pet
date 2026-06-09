import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetPlatformControlState, setPlatformControlState } from '../src/platforms/control-state.js';
import type { RuntimeSettings } from '../src/server/contracts.js';
import { isPetActionName, PET_ACTION_NAMES } from '../src/server/pet-contracts.js';
import { isPlatformName, PLATFORM_NAMES } from '../src/server/platform-contracts.js';
import {
  defaultGetPlatformPublishSource,
  defaultIsPlatformEnabled,
  normalizePublishMode,
} from '../src/server/runtime-platform.js';

function buildSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
  return {
    databaseUrl: 'file:./test.db',
    celeryBrokerUrl: 'redis://localhost:6379/0',
    celeryResultBackend: 'redis://localhost:6379/1',
    apiKey: '',
    adminSessionSecret: '',
    adminSessionTtlSeconds: 60 * 60 * 12,
    llmProvider: 'mock',
    llmApiKeyConfigured: false,
    llmFallbackToMock: true,
    searchProvider: 'serpapi',
    searchApiKeyConfigured: false,
    searchCxConfigured: false,
    publisherMode: 'manual_queue',
    publisherWebhookUrlConfigured: false,
    bilibiliEnabled: false,
    bilibiliPollEnabled: false,
    bilibiliPollIntervalSeconds: 300,
    bilibiliPublishEnabled: false,
    bilibiliEnvCredentialConfigured: false,
    killSwitch: false,
    gatewayToken: '',
    gatewayHmacSecret: '',
    commentIngressToken: '',
    publicCompanionActionsEnabled: false,
    platformBilibiliEnabled: true,
    platformQqEnabled: false,
    platformDouyinEnabled: false,
    platformKuaishouEnabled: true,
    platformBilibiliPublishSource: 'bilibili-custom',
    platformQqPublishSource: '',
    platformDouyinPublishSource: '',
    platformKuaishouPublishSource: 'kuaishou-custom',
    ...overrides,
  };
}

const platformControlTempDirs: string[] = [];

function useIsolatedPlatformControlState(prefix = 'platform-control-runtime-'): string {
  const tempDir = mkdtempSync(join(tmpdir(), prefix));
  platformControlTempDirs.push(tempDir);
  process.env.PLATFORM_CONTROL_STATE_FILE = join(tempDir, 'control-state.json');
  return tempDir;
}

function cleanupPlatformControlTempDirs(): void {
  while (platformControlTempDirs.length > 0) {
    const tempDir = platformControlTempDirs.pop();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  }
}

beforeEach(() => {
  useIsolatedPlatformControlState();
  resetPlatformControlState();
});

afterEach(() => {
  resetPlatformControlState();
  delete process.env.PLATFORM_CONTROL_STATE_FILE;
  cleanupPlatformControlTempDirs();
});

describe('runtime-platform boundaries', () => {
  it('normalizes publish mode text consistently', () => {
    expect(normalizePublishMode('  Native_Bilibili  ')).toBe('native_bilibili');
    expect(normalizePublishMode('WEBHOOK')).toBe('webhook');
  });

  it('resolves platform enabled flags and publish sources from runtime settings', () => {
    const settings = buildSettings();

    expect(defaultIsPlatformEnabled('bilibili', settings)).toBe(true);
    expect(defaultIsPlatformEnabled('qq', settings)).toBe(false);
    expect(defaultIsPlatformEnabled('douyin', settings)).toBe(false);
    expect(defaultIsPlatformEnabled('kuaishou', settings)).toBe(true);

    expect(defaultGetPlatformPublishSource('bilibili', settings)).toBe('bilibili-custom');
    expect(defaultGetPlatformPublishSource('qq', settings)).toBe('qq-sidecar');
    expect(defaultGetPlatformPublishSource('douyin', settings)).toBe('douyin-bot');
    expect(defaultGetPlatformPublishSource('kuaishou', settings)).toBe('kuaishou-custom');
  });

  it('treats bilibili as enabled when the legacy bilibili runtime toggle is active', () => {
    const settings = buildSettings({
      platformBilibiliEnabled: false,
      bilibiliEnabled: true,
    });

    expect(defaultIsPlatformEnabled('bilibili', settings)).toBe(true);
  });

  it('reloads persisted rollout overrides after a module restart', async () => {
    useIsolatedPlatformControlState('platform-control-');
    resetPlatformControlState();

    setPlatformControlState('douyin', {
      enabled: false,
      updatedAt: '2026-04-13T00:00:00.000Z',
    });
    expect(defaultIsPlatformEnabled('douyin', buildSettings({ platformDouyinEnabled: true }))).toBe(false);

    vi.resetModules();
    const runtimePlatform = await import('../src/server/runtime-platform.js');

    expect(runtimePlatform.defaultIsPlatformEnabled('douyin', buildSettings({ platformDouyinEnabled: true }))).toBe(false);
  });
});

describe('contract boundary helpers', () => {
  it('exposes known platform names as a reusable contract boundary', () => {
    expect(PLATFORM_NAMES).toEqual(['bilibili', 'qq', 'douyin', 'kuaishou']);
    expect(isPlatformName('bilibili')).toBe(true);
    expect(isPlatformName('qq')).toBe(true);
    expect(isPlatformName('wechat')).toBe(false);
  });

  it('exposes known pet action names as a reusable contract boundary', () => {
    expect(PET_ACTION_NAMES).toEqual(['pat', 'feed', 'wake']);
    expect(isPetActionName('feed')).toBe(true);
    expect(isPetActionName('dance')).toBe(false);
  });
});
