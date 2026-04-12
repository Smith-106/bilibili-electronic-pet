import { describe, expect, it } from 'vitest';

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
    platformBilibiliEnabled: true,
    platformDouyinEnabled: false,
    platformKuaishouEnabled: true,
    platformBilibiliPublishSource: 'bilibili-custom',
    platformDouyinPublishSource: '',
    platformKuaishouPublishSource: 'kuaishou-custom',
    ...overrides,
  };
}

describe('runtime-platform boundaries', () => {
  it('normalizes publish mode text consistently', () => {
    expect(normalizePublishMode('  Native_Bilibili  ')).toBe('native_bilibili');
    expect(normalizePublishMode('WEBHOOK')).toBe('webhook');
  });

  it('resolves platform enabled flags and publish sources from runtime settings', () => {
    const settings = buildSettings();

    expect(defaultIsPlatformEnabled('bilibili', settings)).toBe(true);
    expect(defaultIsPlatformEnabled('douyin', settings)).toBe(false);
    expect(defaultIsPlatformEnabled('kuaishou', settings)).toBe(true);

    expect(defaultGetPlatformPublishSource('bilibili', settings)).toBe('bilibili-custom');
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
});

describe('contract boundary helpers', () => {
  it('exposes known platform names as a reusable contract boundary', () => {
    expect(PLATFORM_NAMES).toEqual(['bilibili', 'douyin', 'kuaishou']);
    expect(isPlatformName('bilibili')).toBe(true);
    expect(isPlatformName('wechat')).toBe(false);
  });

  it('exposes known pet action names as a reusable contract boundary', () => {
    expect(PET_ACTION_NAMES).toEqual(['pat', 'feed', 'wake']);
    expect(isPetActionName('feed')).toBe(true);
    expect(isPetActionName('dance')).toBe(false);
  });
});
