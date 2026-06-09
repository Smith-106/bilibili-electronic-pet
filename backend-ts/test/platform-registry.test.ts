import { describe, expect, it } from 'vitest';

import type { RuntimeSettings } from '../src/server/contracts.js';
import {
  listPlatformAdapters,
  listPlatformIngressRoutes,
  listPublishingPlatforms,
  resolvePlatformAdapter,
  resolvePlatformBaseEnabled,
  resolvePlatformPollingRuntime,
} from '../src/platforms/registry.js';

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
    platformBilibiliPublishSource: 'bilibili-open',
    platformQqPublishSource: '',
    platformDouyinPublishSource: '',
    platformKuaishouPublishSource: 'kuaishou-open',
    ...overrides,
  };
}

describe('platform adapter registry', () => {
  it('lists stable adapter contracts and ingress routes', () => {
    expect(listPlatformAdapters().map((adapter) => adapter.platform)).toEqual(['bilibili', 'qq', 'douyin', 'kuaishou']);
    expect(listPublishingPlatforms()).toEqual(['bilibili', 'qq', 'douyin', 'kuaishou']);
    expect(listPlatformIngressRoutes()).toEqual([
      { path: '/events/comment/bilibili', source: 'bilibili', platform: 'bilibili' },
      { path: '/events/comment/qq', source: 'qq', platform: 'qq' },
      { path: '/events/comment/douyin', source: 'douyin', platform: 'douyin' },
      { path: '/events/comment/kuaishou', source: 'kuaishou', platform: 'kuaishou' },
    ]);
  });

  it('resolves enabled flags and publish source through adapters', () => {
    const settings = buildSettings();

    expect(resolvePlatformAdapter('bilibili').isEnabled(settings)).toBe(true);
    expect(resolvePlatformAdapter('qq').isEnabled(settings)).toBe(false);
    expect(resolvePlatformAdapter('douyin').isEnabled(settings)).toBe(false);
    expect(resolvePlatformAdapter('kuaishou').resolvePublishSource(settings)).toBe('kuaishou-open');
    expect(resolvePlatformAdapter('qq').resolvePublishSource(settings)).toBe('qq-sidecar');
    expect(resolvePlatformAdapter('douyin').resolvePublishSource(settings)).toBe('douyin-bot');
  });

  it('keeps the bilibili reference adapter enabled when only the legacy bilibili runtime flag is on', () => {
    const settings = buildSettings({
      platformBilibiliEnabled: false,
      bilibiliEnabled: true,
    });

    expect(resolvePlatformAdapter('bilibili').isEnabled(settings)).toBe(true);
  });

  it('exposes base enabled resolution separately from runtime rollout overrides', () => {
    const settings = buildSettings({
      platformDouyinEnabled: true,
    });

    expect(resolvePlatformBaseEnabled('douyin', settings)).toBe(true);
  });

  it('resolves polling runtime through the bilibili adapter', () => {
    expect(resolvePlatformPollingRuntime('bilibili', {
      BILIBILI_POLL_ENABLED: 'true',
      BILIBILI_POLL_INTERVAL_SECONDS: '180',
    })).toEqual({
      enabled: true,
      intervalSeconds: 180,
    });

    expect(resolvePlatformPollingRuntime('douyin')).toEqual({
      enabled: false,
      intervalSeconds: 300,
    });
  });
});
