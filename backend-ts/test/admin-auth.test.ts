import { describe, expect, it } from 'vitest';

import {
  issueAdminSession,
  resolveAdminSessionSecret,
  verifyAdminSessionToken,
} from '../src/server/admin-auth.js';
import type { RuntimeSettings } from '../src/server/contracts.js';

function buildSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
  return {
    databaseUrl: 'file:./test.db',
    celeryBrokerUrl: 'redis://localhost:6379/0',
    celeryResultBackend: 'redis://localhost:6379/1',
    apiKey: '',
    adminSessionSecret: '',
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
    platformBilibiliEnabled: false,
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

function encodePayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

describe('admin auth session helpers', () => {
  it('uses explicit admin session secrets before API keys and returns null without either', () => {
    expect(resolveAdminSessionSecret(buildSettings({ adminSessionSecret: ' session-secret ', apiKey: 'api-key' }))).toBe(
      'session-secret',
    );
    expect(resolveAdminSessionSecret(buildSettings({ adminSessionSecret: ' ', apiKey: ' api-key ' }))).toBe(
      'api-key',
    );
    expect(resolveAdminSessionSecret(buildSettings())).toBeNull();
    expect(issueAdminSession(buildSettings())).toBeNull();
    expect(verifyAdminSessionToken('token', buildSettings())).toBe(false);
  });

  it('normalizes invalid, minimum, and maximum TTL values when issuing sessions', () => {
    const now = Date.UTC(2026, 5, 8, 0, 0, 0);

    const defaultTtl = issueAdminSession(
      buildSettings({ adminSessionSecret: 'secret', adminSessionTtlSeconds: Number.NaN }),
      now,
    );
    const minTtl = issueAdminSession(buildSettings({ adminSessionSecret: 'secret', adminSessionTtlSeconds: 1 }), now);
    const maxTtl = issueAdminSession(
      buildSettings({ adminSessionSecret: 'secret', adminSessionTtlSeconds: 60 * 60 * 24 * 30 }),
      now,
    );

    expect(defaultTtl?.expiresAt).toBe('2026-06-08T12:00:00.000Z');
    expect(minTtl?.expiresAt).toBe('2026-06-08T00:01:00.000Z');
    expect(maxTtl?.expiresAt).toBe('2026-06-15T00:00:00.000Z');
  });

  it('verifies issued tokens and rejects malformed, expired, or tampered tokens', () => {
    const now = Date.UTC(2026, 5, 8, 0, 0, 0);
    const settings = buildSettings({ adminSessionSecret: 'secret', adminSessionTtlSeconds: 3600 });
    const issued = issueAdminSession(settings, now);

    expect(issued).not.toBeNull();
    expect(verifyAdminSessionToken(` ${issued?.token} `, settings, now + 1000)).toBe(true);
    expect(verifyAdminSessionToken('', settings, now)).toBe(false);
    expect(verifyAdminSessionToken('payloadonly', settings, now)).toBe(false);
    expect(verifyAdminSessionToken(`${encodePayload({ v: 'wrong', scope: 'admin', exp: now + 1 })}.sig`, settings, now)).toBe(
      false,
    );
    expect(
      verifyAdminSessionToken(
        `${encodePayload({ v: 'admin-session-v1', scope: 'user', exp: now + 1 })}.sig`,
        settings,
        now,
      ),
    ).toBe(false);
    expect(
      verifyAdminSessionToken(
        `${encodePayload({ v: 'admin-session-v1', scope: 'admin', exp: now - 1 })}.sig`,
        settings,
        now,
      ),
    ).toBe(false);
    expect(verifyAdminSessionToken(`${encodePayload({ v: 'admin-session-v1', scope: 'admin', exp: now + 1 })}.sig`, settings, now)).toBe(
      false,
    );
    expect(verifyAdminSessionToken(`${issued?.token}extra`, settings, now)).toBe(false);
  });

  it('rejects invalid JSON payloads before signature comparison', () => {
    const settings = buildSettings({ apiKey: 'api-key' });
    const encodedPayload = Buffer.from('not-json', 'utf8').toString('base64url');

    expect(verifyAdminSessionToken(`${encodedPayload}.sig`, settings)).toBe(false);
  });
});
