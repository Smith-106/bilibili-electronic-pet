import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestJsonMock, downloadFileMock } = vi.hoisted(() => ({
  requestJsonMock: vi.fn(),
  downloadFileMock: vi.fn(),
}));

vi.mock('../../src/api/client.js', () => ({
  requestJson: requestJsonMock,
  downloadFile: downloadFileMock,
}));

const { createAdminApi } = await import('../../src/api/admin.js');

describe('frontend admin api wrapper', () => {
  beforeEach(() => {
    requestJsonMock.mockReset();
    downloadFileMock.mockReset();
    requestJsonMock.mockResolvedValue({ ok: true });
    downloadFileMock.mockResolvedValue(undefined);
  });

  it('calls read endpoints with encoded path params and filtered query strings', async () => {
    const api = createAdminApi();
    const calls = [
      ['getOverview', [], '/api/admin/overview'],
      ['getMetricsOverview', [], '/api/admin/metrics/overview'],
      ['getPetOverview', [], '/api/admin/pet/overview'],
      ['getPlatformConnections', [], '/api/admin/platforms'],
      ['getObservabilitySummary', [{ windowMinutes: 30, window_minutes: 10 }], '/api/admin/observability/summary?window_minutes=30'],
      ['getObservabilitySummary', [{ window_minutes: 15 }], '/api/admin/observability/summary?window_minutes=15'],
      ['getJobs', [{ status: 'queued', limit: 20 }], '/api/admin/jobs?status=queued&limit=20'],
      ['getJobs', [{ status: '', limit: null }], '/api/admin/jobs'],
      ['getJob', ['job/1'], '/api/jobs/job%2F1'],
      ['getComments', [{ limit: 10, offset: 5 }], '/comments?limit=10&offset=5'],
      ['getComment', ['comment/1'], '/api/comments/comment%2F1'],
      ['getGatewayLogs', [{ limit: 9, commentId: 'comment-1', comment_id: 'legacy' }], '/api/admin/gateway/logs?limit=9&comment_id=comment-1'],
      ['getGatewayLogs', [{ comment_id: 'legacy' }], '/api/admin/gateway/logs?comment_id=legacy'],
      ['getGatewayPublishLogs', [{ limit: 5, offset: 2, status: 'failed' }], '/gateway/publish-logs?limit=5&offset=2&status=failed'],
      ['getAuditSummary', [{ days: 7, action: 'approve', ok: true }], '/api/admin/audit/summary?days=7&action=approve&ok=true'],
      ['getAuditLogs', [{ limit: 10, action: 'retry', ok: false }], '/api/audit-log?limit=10&action=retry&ok=false'],
      ['getDailyMetrics', [{ days: 3 }], '/api/metrics/daily?days=3'],
      ['getKnowledgeEntries', [{ limit: 3, offset: 1 }], '/api/admin/knowledge?limit=3&offset=1'],
      ['getMemorySpaces', [{ limit: 1, offset: 2, space_type: 'user', subject_type: 'viewer', subject_id: 'u1' }], '/api/admin/memory/spaces?limit=1&offset=2&space_type=user&subject_type=viewer&subject_id=u1'],
      ['getMemoryItems', [{ limit: 1, offset: 2, space_id: 's1', item_key: 'k1', content_type: 'json', source: 'test' }], '/api/admin/memory/items?limit=1&offset=2&space_id=s1&item_key=k1&content_type=json&source=test'],
      ['getMemoryGrants', [{ limit: 1, offset: 2, space_id: 's1', subject_type: 'viewer', subject_id: 'u1' }], '/api/admin/memory/grants?limit=1&offset=2&space_id=s1&subject_type=viewer&subject_id=u1'],
      ['getMemoryIdentityLinks', [{ limit: 1, offset: 2, subject_type: 'viewer', subject_id: 'u1', platform: 'qq', external_id: 'e1' }], '/api/admin/memory/identity-links?limit=1&offset=2&subject_type=viewer&subject_id=u1&platform=qq&external_id=e1'],
      ['getRoleCards', [{ limit: 4, offset: 8 }], '/api/admin/role-cards?limit=4&offset=8'],
      ['getStyleProfile', [], '/api/admin/style-profile'],
      ['getRoleProfile', [], '/api/admin/role-profile'],
      ['getBilibiliStatus', [], '/api/admin/bilibili/status'],
      ['getReadinessStatus', [], '/readiness'],
      ['getBilibiliVideos', [{ poll_enabled: false, limit: 20, offset: 1 }], '/api/admin/bilibili/videos?poll_enabled=false&limit=20&offset=1'],
      ['getBilibiliCredentials', [], '/api/admin/bilibili/credentials'],
    ];

    for (const [method, args, expectedPath] of calls) {
      requestJsonMock.mockClear();
      await api[method](...args);
      expect(requestJsonMock).toHaveBeenCalledWith(expectedPath);
    }
  });

  it('calls mutation endpoints with POST, DELETE, JSON body, and encoded params', async () => {
    const api = createAdminApi();
    const calls = [
      ['recordPetAction', ['pat', 'note'], '/api/admin/pet/actions', { method: 'POST', body: { action: 'pat', note: 'note' } }],
      ['setPlatformConnectionControl', ['qq/group', true], '/api/admin/platforms/qq%2Fgroup/control', { method: 'POST', body: { enabled: true } }],
      ['approveJob', ['job/1'], '/api/jobs/job%2F1/approve', { method: 'POST' }],
      ['retryJob', ['job/1', { reason: 'manual' }], '/api/jobs/job%2F1/retry', { method: 'POST', body: { reason: 'manual' } }],
      ['retryJob', ['job/1'], '/api/jobs/job%2F1/retry', { method: 'POST', body: {} }],
      ['batchApprove', [['job-1', 'job-2']], '/api/jobs/approve-batch', { method: 'POST', body: { job_ids: ['job-1', 'job-2'] } }],
      ['batchRetry', [['job-3']], '/api/jobs/retry-batch', { method: 'POST', body: { job_ids: ['job-3'] } }],
      ['publishGatewayReply', [{ comment_id: 'c1' }], '/gateway/publish', { method: 'POST', body: { comment_id: 'c1' } }],
      ['publishPlatformReply', ['qq/group', { comment_id: 'c1' }], '/gateway/publish/qq%2Fgroup', { method: 'POST', body: { comment_id: 'c1' } }],
      ['createKnowledgeEntry', [{ title: 'k' }], '/api/admin/knowledge', { method: 'POST', body: { title: 'k' } }],
      ['disableKnowledgeEntry', ['entry/1'], '/api/admin/knowledge/entry%2F1/disable', { method: 'POST' }],
      ['createMemorySpace', [{ space: 's' }], '/api/admin/memory/spaces', { method: 'POST', body: { space: 's' } }],
      ['upsertMemoryItem', [{ item: 'i' }], '/api/admin/memory/items', { method: 'POST', body: { item: 'i' } }],
      ['grantMemorySpaceAccess', [{ grant: 'g' }], '/api/admin/memory/grants', { method: 'POST', body: { grant: 'g' } }],
      ['linkMemoryIdentity', [{ link: 'l' }], '/api/admin/memory/identity-links', { method: 'POST', body: { link: 'l' } }],
      ['createRoleCard', [{ card: 'c' }], '/api/admin/role-cards', { method: 'POST', body: { card: 'c' } }],
      ['updateRoleCard', ['card/1', { card: 'new' }], '/api/admin/role-cards/card%2F1', { method: 'POST', body: { card: 'new' } }],
      ['disableRoleCard', ['card/1'], '/api/admin/role-cards/card%2F1/disable', { method: 'POST' }],
      ['activateRoleCard', ['card/1'], '/api/admin/role-cards/card%2F1/activate', { method: 'POST' }],
      ['setStyleProfile', ['meme'], '/api/admin/style-profile', { method: 'POST', body: { style: 'meme' } }],
      ['setRoleProfile', ['comfort'], '/api/admin/role-profile', { method: 'POST', body: { role: 'comfort' } }],
      ['addBilibiliVideo', ['BV1'], '/api/admin/bilibili/videos', { method: 'POST', body: { bvid: 'BV1' } }],
      ['toggleBilibiliVideoPoll', ['video/1'], '/api/admin/bilibili/videos/video%2F1/toggle-poll', { method: 'POST' }],
      ['syncBilibiliVideo', ['video/1'], '/api/admin/bilibili/videos/video%2F1/sync', { method: 'POST' }],
      ['deleteBilibiliVideo', ['video/1'], '/api/admin/bilibili/videos/video%2F1', { method: 'DELETE' }],
      ['triggerBilibiliPoll', [], '/api/admin/bilibili/poll', { method: 'POST' }],
      ['addBilibiliCredential', [{ name: 'credential' }], '/api/admin/bilibili/credentials', { method: 'POST', body: { name: 'credential' } }],
      ['activateBilibiliCredential', ['credential/1'], '/api/admin/bilibili/credentials/credential%2F1/activate', { method: 'POST' }],
      ['deleteBilibiliCredential', ['credential/1'], '/api/admin/bilibili/credentials/credential%2F1', { method: 'DELETE' }],
    ];

    for (const [method, args, expectedPath, expectedOptions] of calls) {
      requestJsonMock.mockClear();
      await api[method](...args);
      if (expectedOptions.body) {
        expect(requestJsonMock).toHaveBeenCalledWith(
          expectedPath,
          expect.objectContaining({
            method: expectedOptions.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expectedOptions.body),
          }),
        );
      } else if (expectedOptions.method) {
        expect(requestJsonMock).toHaveBeenCalledWith(
          expectedPath,
          expect.objectContaining({
            method: expectedOptions.method,
          }),
        );
      } else {
        expect(requestJsonMock).toHaveBeenCalledWith(expectedPath);
      }
    }
  });

  it('delegates CSV exports to downloadFile with filtered query strings and filenames', async () => {
    const api = createAdminApi();

    await api.exportJobsCsv({ status: 'queued', limit: 10 });
    expect(downloadFileMock).toHaveBeenLastCalledWith('/export/jobs.csv?status=queued&limit=10', 'jobs.csv');

    await api.exportJobsCsv({ status: '', limit: null });
    expect(downloadFileMock).toHaveBeenLastCalledWith('/export/jobs.csv', 'jobs.csv');

    await api.exportAuditCsv({ limit: 5, action: 'approve', ok: false });
    expect(downloadFileMock).toHaveBeenLastCalledWith('/export/audit-logs.csv?limit=5&action=approve&ok=false', 'audit-logs.csv');
  });
});
