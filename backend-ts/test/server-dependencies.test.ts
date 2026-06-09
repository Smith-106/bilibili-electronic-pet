/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, it, vi } from 'vitest';

import { buildDefaultServerDependencies } from '../src/server/dependencies.js';
import type { RuntimeSettings } from '../src/server/contracts.js';

function buildSettings(): RuntimeSettings {
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
    publisherMode: 'webhook',
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
  };
}

describe('buildDefaultServerDependencies', () => {
  it('wires default dependency functions through stable wrappers', async () => {
    const settings = buildSettings();
    const reserve = vi.fn(() => ({ duplicate: false, reservationKey: 'reservation-1' }));
    const finalize = vi.fn();
    const input = {
      buildSettings: vi.fn(() => settings),
      createLogStore: vi.fn(() => ({ reserve, finalize })),
      checkDatabaseConnection: vi.fn(() => ({ connected: true })),
      checkRedisConnection: vi.fn(() => ({ connected: false, error: 'redis_down' })),
      probeBilibiliAuth: vi.fn(() => ({ ok: true, reason: 'ok' })),
      buildBilibiliDiagnostics: vi.fn(() => ({
        ready: true,
        blocking_reasons: [],
        effective_publish_mode: 'webhook',
        signals: { ready: true },
      })),
      verifyPayloadSignature: vi.fn(() => true),
      normalizePublishFailureReason: vi.fn((reason?: string) => reason ?? 'invalid_response'),
      isPlatformEnabled: vi.fn(() => true),
      getPlatformPublishSource: vi.fn(() => 'qq-sidecar'),
      createTraceId: vi.fn((preferred?: string) => preferred ?? 'trace-generated'),
      getAdminOverview: vi.fn(() => ({ total_comments: 1 })),
      listAdminJobs: vi.fn(() => ({ items: [], total: 0, limit: 10, offset: 0 })),
      listAdminGatewayLogs: vi.fn(() => ({ items: [] })),
      summarizeAdminAuditLogs: vi.fn(() => ({
        ok: true,
        days: 7,
        totals: {},
        by_action: {},
        by_result: {},
      })),
      listKnowledgeEntries: vi.fn(() => ({ ok: true, items: [] })),
      createKnowledgeEntry: vi.fn((value) => ({
        ok: true,
        item: { id: 1, enabled: true, updated_at: null, ...value },
      })),
      disableKnowledgeEntry: vi.fn((value) => ({
        ok: true,
        item: { id: value.entryId, enabled: false, updated_at: null },
      })),
      listMemorySpaces: vi.fn(() => ({ ok: true, items: [] })),
      createMemorySpace: vi.fn((value) => ({
        ok: true,
        item: {
          id: 1,
          space_type: value.space_type ?? 'subject',
          summary: value.summary ?? '',
          created_at: null,
          updated_at: null,
          ...value,
        },
      })),
      listMemoryItems: vi.fn(() => ({ ok: true, items: [] })),
      upsertMemoryItem: vi.fn((value) => ({
        ok: true,
        item: {
          id: 1,
          content_type: value.content_type ?? 'text',
          source: value.source ?? 'test',
          item_metadata: value.item_metadata ?? {},
          created_at: null,
          updated_at: null,
          ...value,
        },
      })),
      listMemoryGrants: vi.fn(() => ({ ok: true, items: [] })),
      grantMemorySpaceAccess: vi.fn((value) => ({
        ok: true,
        item: { id: 1, access_level: value.access_level ?? 'read', created_at: null, updated_at: null, ...value },
      })),
      listMemoryIdentityLinks: vi.fn(() => ({ ok: true, items: [] })),
      linkMemoryIdentity: vi.fn((value) => ({
        ok: true,
        item: { id: 1, platform: value.platform ?? 'bilibili', display_name: null, created_at: null, updated_at: null, ...value },
      })),
      getStyleProfile: vi.fn(() => ({ ok: true, style_profile: 'auto', preset_profiles: ['auto'] })),
      setStyleProfile: vi.fn((value) => ({ ok: true, style_profile: value.styleProfile })),
      getRoleProfile: vi.fn(() => ({ ok: true, role_profile: 'auto', preset_profiles: ['auto'] })),
      setRoleProfile: vi.fn((value) => ({ ok: true, role_profile: value.roleProfile })),
      listRoleCards: vi.fn(() => ({ ok: true, active_role_card_key: null, items: [] })),
      createRoleCard: vi.fn((value) => ({
        ok: true,
        item: { id: 1, is_active: false, created_at: null, updated_at: null, ...value },
      })),
      updateRoleCard: vi.fn((value) => ({
        ok: true,
        item: {
          id: 1,
          key: value.cardKey,
          name: value.name ?? '',
          description: value.description ?? '',
          system_prompt: value.system_prompt ?? '',
          tone: value.tone ?? '',
          constraints: value.constraints ?? '',
          enabled: value.enabled ?? true,
          is_active: false,
          created_at: null,
          updated_at: null,
        },
      })),
      disableRoleCard: vi.fn((value) => ({
        ok: true,
        item: { key: value.cardKey, enabled: false, is_active: false, updated_at: null },
      })),
      activateRoleCard: vi.fn((value) => ({ ok: true, active_role_card_key: value.cardKey })),
      getObservabilitySummary: vi.fn((value) => ({ ok: true, summary: { window_minutes: value.windowMinutes } })),
      ingestCommentEvent: vi.fn((value) => ({
        ok: true,
        comment_id: value.event.comment_id,
        trace_id: 'trace-ingest',
      })),
      retryJob: vi.fn((value) => ({ ok: true, requeued: true, job_id: value.jobId, trace_id: 'trace-retry' })),
      approveJob: vi.fn((value) => ({ ok: true, job_id: value.jobId, status: 'published', trace_id: 'trace-approve' })),
      approveJobsBatch: vi.fn((value) => ({
        ok: true,
        summary: { total: value.jobIds.length, success: value.jobIds.length, failed: 0 },
        results: [],
        trace_id: 'trace-approve-batch',
      })),
      retryJobsBatch: vi.fn((value) => ({
        ok: true,
        summary: { total: value.jobIds.length, success: value.jobIds.length, failed: 0 },
        results: [],
        trace_id: 'trace-retry-batch',
      })),
      getComment: vi.fn((value) => ({ ok: true, comment: { id: value.commentId }, jobs: [] })),
      getJob: vi.fn((value) => ({ ok: true, item: { id: value.jobId } })),
      listJobs: vi.fn(() => ({ ok: true, items: [] })),
      exportJobsCsv: vi.fn(() => 'id,status\n1,published'),
      getBilibiliStatus: vi.fn(() => ({
        ok: true,
        config: {},
        credential: null,
        videos: {},
        diagnostics: {},
      })),
      listBilibiliVideos: vi.fn(() => ({ ok: true, total: 0, items: [] })),
      addBilibiliVideo: vi.fn((value) => ({
        ok: true,
        item: {
          id: 1,
          bvid: value.bvid,
          aid: null,
          title: null,
          owner_mid: null,
          poll_enabled: value.pollEnabled ?? true,
          comment_count: 0,
          last_polled_at: null,
          last_poll_status: null,
          last_poll_error: null,
          last_rpid: null,
          created_at: null,
          updated_at: null,
        },
      })),
      getCompanionState: vi.fn(() => ({ petName: 'Mochi' })),
      getCompanionStateV2: vi.fn(() => ({ version: 'v2', companion: { petName: 'Mochi' } })),
      recordCompanionAction: vi.fn((value) => ({ ok: true, action: value.action, item_key: `action:${value.action}` })),
      listPlatformConnections: vi.fn(() => ({ ok: true, items: [] })),
      updatePlatformConnectionControl: vi.fn((_settings, value) => ({
        ok: true,
        item: { platform: value.platform, enabled: value.enabled },
      })),
    };

    const deps = buildDefaultServerDependencies(input as any);

    expect(deps.settings).toBe(settings);
    expect(await deps.checkDatabaseConnection()).toEqual({ connected: true });
    expect(await deps.checkRedisConnection()).toEqual({ connected: false, error: 'redis_down' });
    expect(await deps.probeBilibiliAuth({} as any)).toEqual({ ok: true, reason: 'ok' });
    expect(await deps.buildBilibiliDiagnostics()).toMatchObject({ ready: true });
    expect(deps.verifyPayloadSignature({}, 'secret', 'sig')).toBe(true);
    expect(await deps.reservePublishLog({} as any)).toEqual({ duplicate: false, reservationKey: 'reservation-1' });
    await deps.finalizePublishLog({ reservationKey: 'reservation-1', status: 'published', source: 'test' });
    expect(await deps.publishGatewayReply({} as any)).toEqual({ published: false, reason: 'not_configured' });
    expect(await deps.publishPlatformReply({} as any)).toEqual({ published: false, reason: 'not_configured' });
    expect(deps.normalizePublishFailureReason(undefined)).toBe('invalid_response');
    expect(deps.isPlatformEnabled('qq', settings)).toBe(true);
    expect(deps.getPlatformPublishSource('qq', settings)).toBe('qq-sidecar');
    expect(deps.createTraceId('trace-1')).toBe('trace-1');
    expect(await deps.getAdminOverview()).toEqual({ total_comments: 1 });
    expect(await deps.listAdminJobs({ limit: 10, offset: 0 })).toMatchObject({ total: 0 });
    expect(await deps.listAdminGatewayLogs({ limit: 10 })).toEqual({ items: [] });
    expect(await deps.summarizeAdminAuditLogs({ days: 7 })).toMatchObject({ ok: true });
    expect(await deps.listKnowledgeEntries({ limit: 10, offset: 0 })).toEqual({ ok: true, items: [] });
    expect(await deps.createKnowledgeEntry({ category: 'c', title: 't', content: 'body' })).toMatchObject({ ok: true });
    expect(await deps.disableKnowledgeEntry({ entryId: 3 })).toMatchObject({ item: { id: 3, enabled: false } });
    expect(await deps.listMemorySpaces({ limit: 10, offset: 0 })).toEqual({ ok: true, items: [] });
    expect(await deps.createMemorySpace({ space_key: 's', title: 'Space' })).toMatchObject({ item: { space_key: 's' } });
    expect(await deps.listMemoryItems({ limit: 10, offset: 0 })).toEqual({ ok: true, items: [] });
    expect(await deps.upsertMemoryItem({ space_id: 1, item_key: 'i', content: 'body' })).toMatchObject({
      item: { item_key: 'i' },
    });
    expect(await deps.listMemoryGrants({ limit: 10, offset: 0 })).toEqual({ ok: true, items: [] });
    expect(await deps.grantMemorySpaceAccess({ space_id: 1, subject_type: 'user', subject_id: 'u' })).toMatchObject({
      item: { subject_id: 'u' },
    });
    expect(await deps.listMemoryIdentityLinks({ limit: 10, offset: 0 })).toEqual({ ok: true, items: [] });
    expect(await deps.linkMemoryIdentity({ subject_type: 'user', subject_id: 'u', external_id: 'e' })).toMatchObject({
      item: { external_id: 'e' },
    });
    expect(await deps.getStyleProfile()).toMatchObject({ style_profile: 'auto' });
    expect(await deps.setStyleProfile({ styleProfile: 'meme' })).toEqual({ ok: true, style_profile: 'meme' });
    expect(await deps.getRoleProfile()).toMatchObject({ role_profile: 'auto' });
    expect(await deps.setRoleProfile({ roleProfile: 'comfort' })).toEqual({ ok: true, role_profile: 'comfort' });
    expect(await deps.listRoleCards({ limit: 10, offset: 0 })).toMatchObject({ active_role_card_key: null });
    expect(await deps.createRoleCard({
      key: 'card',
      name: 'Card',
      description: '',
      system_prompt: '',
      tone: '',
      constraints: '',
      enabled: true,
    })).toMatchObject({ item: { key: 'card' } });
    expect(await deps.updateRoleCard({ cardKey: 'card', name: 'Updated' })).toMatchObject({ item: { key: 'card' } });
    expect(await deps.disableRoleCard({ cardKey: 'card' })).toMatchObject({ item: { enabled: false } });
    expect(await deps.activateRoleCard({ cardKey: 'card' })).toEqual({ ok: true, active_role_card_key: 'card' });
    expect(await deps.getObservabilitySummary({ windowMinutes: 15 })).toEqual({
      ok: true,
      summary: { window_minutes: 15 },
    });
    expect(await deps.ingestCommentEvent({ event: { comment_id: 'c', source: 'test' }, source: 'test' })).toMatchObject({
      comment_id: 'c',
    });
    expect(await deps.retryJob({ jobId: 1 })).toMatchObject({ requeued: true });
    expect(await deps.approveJob({ jobId: 1 })).toMatchObject({ status: 'published' });
    expect(await deps.approveJobsBatch({ jobIds: [1, 2] })).toMatchObject({ summary: { total: 2 } });
    expect(await deps.retryJobsBatch({ jobIds: [1] })).toMatchObject({ summary: { total: 1 } });
    expect(await deps.getComment({ commentId: 'comment-1' })).toMatchObject({ comment: { id: 'comment-1' } });
    expect(await deps.getJob({ jobId: 1 })).toMatchObject({ item: { id: 1 } });
    expect(await deps.listJobs({ limit: 10, offset: 0 })).toEqual({ ok: true, items: [] });
    expect(await deps.exportJobsCsv({ limit: 10 })).toContain('published');
    expect(await deps.getBilibiliStatus()).toMatchObject({ ok: true });
    expect(await deps.listBilibiliVideos({ limit: 10, offset: 0 })).toMatchObject({ total: 0 });
    expect(await deps.addBilibiliVideo({ bvid: 'BV1' })).toMatchObject({ item: { bvid: 'BV1' } });
    expect(await deps.getCompanionState()).toMatchObject({ petName: 'Mochi' });
    expect(await deps.getCompanionStateV2()).toMatchObject({ version: 'v2' });
    expect(await deps.recordCompanionAction({ action: 'pat' })).toMatchObject({ action: 'pat' });
    expect(await deps.listPlatformConnections()).toEqual({ ok: true, items: [] });
    expect(await deps.updatePlatformConnectionControl({ platform: 'qq', enabled: true })).toMatchObject({
      item: { platform: 'qq', enabled: true },
    });

    expect(input.buildSettings).toHaveBeenCalledTimes(1);
    expect(input.createLogStore).toHaveBeenCalledTimes(1);
    expect(input.buildBilibiliDiagnostics).toHaveBeenCalledWith(settings, input.probeBilibiliAuth);
    expect(input.getBilibiliStatus).toHaveBeenCalledWith({
      settings,
      buildBilibiliDiagnostics: expect.any(Function),
    });
    expect(input.listPlatformConnections).toHaveBeenCalledWith(settings);
    expect(input.updatePlatformConnectionControl).toHaveBeenCalledWith(settings, { platform: 'qq', enabled: true });
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(finalize).toHaveBeenCalledTimes(1);
  });
});
