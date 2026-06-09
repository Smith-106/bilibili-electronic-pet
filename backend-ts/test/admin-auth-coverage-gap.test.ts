import { describe, expect, it } from 'vitest';

import type { RuntimeSettings } from '../src/server/contracts.js';
import { issueAdminSession, resolveAdminSessionSecret, verifyAdminSessionToken } from '../src/server/admin-auth.js';

function buildSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
  return {
    databaseUrl: 'file:./test.db',
    celeryBrokerUrl: 'redis://localhost:6379/0',
    celeryResultBackend: 'redis://localhost:6379/1',
    apiKey: 'api-key-secret',
    adminSessionSecret: 'admin-secret',
    adminSessionTtlSeconds: 3600,
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
    platformKuaishouEnabled: false,
    platformBilibiliPublishSource: 'bilibili-bot',
    platformQqPublishSource: 'qq-sidecar',
    platformDouyinPublishSource: 'douyin-bot',
    platformKuaishouPublishSource: 'kuaishou-bot',
    ...overrides,
  };
}

function encodePayload(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

describe('admin auth coverage gaps', () => {
  it('falls back from empty admin session secret to api key and clamps ttl bounds', () => {
    const lowTtl = buildSettings({ adminSessionSecret: '   ', adminSessionTtlSeconds: 1 });
    const highTtl = buildSettings({ adminSessionTtlSeconds: 60 * 60 * 24 * 30 });
    const undefinedSecrets = buildSettings({
      adminSessionSecret: undefined,
      apiKey: undefined,
      adminSessionTtlSeconds: undefined,
    });

    expect(resolveAdminSessionSecret(lowTtl)).toBe('api-key-secret');
    expect(resolveAdminSessionSecret(undefinedSecrets)).toBeNull();

    const lowSession = issueAdminSession(lowTtl, 1_000);
    const highSession = issueAdminSession(highTtl, 1_000);
    const defaultTtlSession = issueAdminSession(buildSettings({ adminSessionTtlSeconds: Number.NaN }), 1_000);

    expect(lowSession?.expiresAt).toBe(new Date(61_000).toISOString());
    expect(highSession?.expiresAt).toBe(new Date(1_000 + 60 * 60 * 24 * 7 * 1000).toISOString());
    expect(defaultTtlSession?.expiresAt).toBe(new Date(1_000 + 60 * 60 * 12 * 1000).toISOString());
    expect(verifyAdminSessionToken(lowSession?.token ?? '', lowTtl, 2_000)).toBe(true);
  });

  it('rejects malformed, expired, wrong-scope, and mismatched admin session tokens', () => {
    const settings = buildSettings();
    const session = issueAdminSession(settings, 1_000);
    expect(session).not.toBeNull();

    const [payload, signature] = String(session?.token).split('.');
    const wrongVersionPayload = encodePayload({
      v: 'old-version',
      scope: 'admin',
      iat: 1_000,
      exp: 61_000,
      nonce: 'nonce',
    });
    const wrongScopePayload = encodePayload({
      v: 'admin-session-v1',
      scope: 'user',
      iat: 1_000,
      exp: 61_000,
      nonce: 'nonce',
    });

    expect(verifyAdminSessionToken('', settings, 2_000)).toBe(false);
    expect(verifyAdminSessionToken(undefined as unknown as string, settings, 2_000)).toBe(false);
    expect(verifyAdminSessionToken('missing-dot', settings, 2_000)).toBe(false);
    expect(verifyAdminSessionToken(`${payload}.`, settings, 2_000)).toBe(false);
    expect(verifyAdminSessionToken(`%%%.${signature}`, settings, 2_000)).toBe(false);
    expect(verifyAdminSessionToken('not-base64.not-a-signature', settings, 2_000)).toBe(false);
    expect(verifyAdminSessionToken(`${payload}.short`, settings, 2_000)).toBe(false);
    expect(verifyAdminSessionToken(`${wrongVersionPayload}.${signature}`, settings, 2_000)).toBe(false);
    expect(verifyAdminSessionToken(`${wrongScopePayload}.${signature}`, settings, 2_000)).toBe(false);
    expect(verifyAdminSessionToken(String(session?.token), settings, 3_601_000)).toBe(false);
    expect(verifyAdminSessionToken(String(session?.token), buildSettings({ adminSessionSecret: 'other' }), 2_000)).toBe(
      false,
    );
    expect(
      verifyAdminSessionToken(String(session?.token), buildSettings({ apiKey: '', adminSessionSecret: '' }), 2_000),
    ).toBe(false);
    expect(issueAdminSession(buildSettings({ apiKey: '', adminSessionSecret: '' }), 1_000)).toBeNull();
  });
});
