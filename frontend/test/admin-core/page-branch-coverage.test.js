import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer, flushPromises } from '../utils/dom.js';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getOverview: vi.fn(),
    getMetricsOverview: vi.fn(),
    getObservabilitySummary: vi.fn(),
    getReadinessStatus: vi.fn(),
    getJobs: vi.fn(),
    approveJob: vi.fn(),
    retryJob: vi.fn(),
    batchApprove: vi.fn(),
    batchRetry: vi.fn(),
    exportJobsCsv: vi.fn(),
    getGatewayLogs: vi.fn(),
    getAuditSummary: vi.fn(),
    getPetOverview: vi.fn(),
    recordPetAction: vi.fn(),
    getAuditLogs: vi.fn(),
    exportAuditCsv: vi.fn(),
    getDailyMetrics: vi.fn(),
    getStyleProfile: vi.fn(),
    setStyleProfile: vi.fn(),
    getRoleProfile: vi.fn(),
    setRoleProfile: vi.fn(),
    getComments: vi.fn(),
    getComment: vi.fn(),
    getJob: vi.fn(),
    getMemorySpaces: vi.fn(),
    createMemorySpace: vi.fn(),
    getMemoryItems: vi.fn(),
    upsertMemoryItem: vi.fn(),
    getMemoryGrants: vi.fn(),
    grantMemorySpaceAccess: vi.fn(),
    getMemoryIdentityLinks: vi.fn(),
    linkMemoryIdentity: vi.fn(),
    getRoleCards: vi.fn(),
    createRoleCard: vi.fn(),
    updateRoleCard: vi.fn(),
    disableRoleCard: vi.fn(),
    activateRoleCard: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('../../src/api/admin.js', () => ({
  createAdminApi: () => mockApi,
}));

vi.mock('../../src/components/toast.js', () => ({
  showToast: mockShowToast,
}));

const [
  { render: renderAudit },
  { render: renderDailyMetrics },
  { render: renderDashboard },
  { render: renderJobs },
  { render: renderMemory },
  { render: renderPetCore },
  { render: renderProfiles },
  { render: renderQuery },
  { render: renderRoleCards },
] = await Promise.all([
  import('../../src/pages/audit.js'),
  import('../../src/pages/daily-metrics.js'),
  import('../../src/pages/dashboard.js'),
  import('../../src/pages/jobs.js'),
  import('../../src/pages/memory.js'),
  import('../../src/pages/pet-core.js'),
  import('../../src/pages/profiles.js'),
  import('../../src/pages/query.js'),
  import('../../src/pages/role-cards.js'),
]);

function resetMocks() {
  for (const mock of Object.values(mockApi)) {
    mock.mockReset();
  }
  mockShowToast.mockReset();
  sessionStorage.clear();

  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: undefined,
    configurable: true,
  });

  mockApi.getOverview.mockResolvedValue({
    total_comments: 0,
    total_jobs: 0,
    total_published: 0,
    pending_review: 0,
    total_failed: 0,
  });
  mockApi.getMetricsOverview.mockResolvedValue({});
  mockApi.getObservabilitySummary.mockResolvedValue({ ok: false });
  mockApi.getReadinessStatus.mockResolvedValue({});
  mockApi.getJobs.mockResolvedValue({ items: [] });
  mockApi.approveJob.mockResolvedValue({ ok: true });
  mockApi.retryJob.mockResolvedValue({ ok: true });
  mockApi.batchApprove.mockResolvedValue({ ok: true });
  mockApi.batchRetry.mockResolvedValue({ ok: true });
  mockApi.exportJobsCsv.mockResolvedValue(undefined);
  mockApi.getGatewayLogs.mockResolvedValue({ items: [] });
  mockApi.getAuditSummary.mockResolvedValue({});

  mockApi.getPetOverview.mockResolvedValue({
    item: {
      snapshot: {},
      companion: {},
    },
  });
  mockApi.recordPetAction.mockResolvedValue({ ok: true });

  mockApi.getAuditLogs.mockResolvedValue({ items: [] });
  mockApi.exportAuditCsv.mockResolvedValue(undefined);
  mockApi.getDailyMetrics.mockResolvedValue({ items: [] });
  mockApi.getStyleProfile.mockResolvedValue({ style: 'auto' });
  mockApi.setStyleProfile.mockResolvedValue({ ok: true });
  mockApi.getRoleProfile.mockResolvedValue({ role: 'auto' });
  mockApi.setRoleProfile.mockResolvedValue({ ok: true });
  mockApi.getComments.mockResolvedValue({ items: [], total: 0 });
  mockApi.getComment.mockResolvedValue({});
  mockApi.getJob.mockResolvedValue({});

  mockApi.getMemorySpaces.mockResolvedValue({ items: [] });
  mockApi.createMemorySpace.mockResolvedValue({ ok: true });
  mockApi.getMemoryItems.mockResolvedValue({ items: [] });
  mockApi.upsertMemoryItem.mockResolvedValue({ ok: true });
  mockApi.getMemoryGrants.mockResolvedValue({ items: [] });
  mockApi.grantMemorySpaceAccess.mockResolvedValue({ ok: true });
  mockApi.getMemoryIdentityLinks.mockResolvedValue({ items: [] });
  mockApi.linkMemoryIdentity.mockResolvedValue({ ok: true });

  mockApi.getRoleCards.mockResolvedValue({ items: [] });
  mockApi.createRoleCard.mockResolvedValue({ ok: true });
  mockApi.updateRoleCard.mockResolvedValue({ ok: true });
  mockApi.disableRoleCard.mockResolvedValue({ ok: true });
  mockApi.activateRoleCard.mockResolvedValue({ ok: true });
}

describe('admin page branch coverage', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('renders memory fallback values, creates grants and identity links, and reports failures', async () => {
    const container = createPageContainer();
    mockApi.getMemorySpaces.mockResolvedValue({
      items: [{
        id: 7,
        space_key: 'operator:alpha',
        space_type: 'operator',
        title: 'Alpha',
        summary: '',
        updated_at: null,
      }],
    });
    mockApi.getMemoryItems.mockResolvedValue({
      items: [{
        id: 1,
        space_id: 7,
        item_key: 'empty-content',
        content: '',
        content_type: 'note',
        source: 'operator',
        updated_at: null,
      }],
    });
    mockApi.getMemoryGrants.mockResolvedValue({ items: [] });
    mockApi.getMemoryIdentityLinks.mockResolvedValue({
      items: [{
        id: 2,
        subject_type: 'operator',
        subject_id: 'alice',
        platform: 'bilibili',
        external_id: 'uid-42',
        display_name: '',
        updated_at: null,
      }],
    });

    await renderMemory(container);

    expect(container.textContent).toContain('empty-content');
    expect(container.textContent).toContain('uid-42');

    container.querySelector('#memory-grant-space').value = '7';
    container.querySelector('#memory-grant-subject-id').value = 'alice';
    container.querySelector('#memory-grant-create').click();
    await flushPromises();
    expect(mockApi.grantMemorySpaceAccess).toHaveBeenCalledWith({
      space_id: 7,
      subject_type: 'operator',
      subject_id: 'alice',
      access_level: 'read',
    });

    container.querySelector('#memory-link-subject-id').value = 'alice';
    container.querySelector('#memory-link-external-id').value = 'uid-99';
    container.querySelector('#memory-link-display-name').value = 'Alice';
    container.querySelector('#memory-link-create').click();
    await flushPromises();
    expect(mockApi.linkMemoryIdentity).toHaveBeenCalledWith({
      subject_type: 'operator',
      subject_id: 'alice',
      platform: 'bilibili',
      external_id: 'uid-99',
      display_name: 'Alice',
    });

    mockApi.createMemorySpace.mockRejectedValueOnce(new Error('space failed'));
    container.querySelector('#memory-space-key').value = 'operator:beta';
    container.querySelector('#memory-space-title').value = 'Beta';
    container.querySelector('#memory-space-create').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('space failed'), 'error');

    mockApi.upsertMemoryItem.mockRejectedValueOnce(new Error('item failed'));
    container.querySelector('#memory-item-space').value = '7';
    container.querySelector('#memory-item-key').value = 'status:next';
    container.querySelector('#memory-item-content').value = 'next';
    container.querySelector('#memory-item-create').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('item failed'), 'error');

    mockApi.grantMemorySpaceAccess.mockRejectedValueOnce(new Error('grant failed'));
    container.querySelector('#memory-grant-space').value = '7';
    container.querySelector('#memory-grant-subject-id').value = 'bob';
    container.querySelector('#memory-grant-create').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('grant failed'), 'error');

    mockApi.linkMemoryIdentity.mockRejectedValueOnce(new Error('link failed'));
    container.querySelector('#memory-link-subject-id').value = 'bob';
    container.querySelector('#memory-link-external-id').value = 'uid-100';
    container.querySelector('#memory-link-create').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('link failed'), 'error');
  });

  it('handles memory empty fallback responses, validation warnings, and reload failures', async () => {
    const container = createPageContainer();
    mockApi.getMemorySpaces.mockResolvedValue({ items: null });
    mockApi.getMemoryItems.mockResolvedValue({ items: null });
    mockApi.getMemoryGrants.mockResolvedValue({ items: null });
    mockApi.getMemoryIdentityLinks.mockResolvedValue({ items: null });

    await renderMemory(container);

    expect(container.querySelectorAll('.table-empty')).toHaveLength(4);

    container.querySelector('#memory-space-create').click();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    container.querySelector('#memory-item-create').click();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    container.querySelector('#memory-link-create').click();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    mockApi.getMemorySpaces.mockRejectedValueOnce(new Error('memory down'));
    container.querySelector('#memory-refresh').click();
    await flushPromises();
    expect(container.textContent).toContain('memory down');
  });

  it('renders dashboard rejected dependencies, nested observability, refresh, and fatal load errors', async () => {
    const container = createPageContainer();
    mockApi.getOverview.mockRejectedValueOnce(new Error('overview down'));
    mockApi.getJobs.mockRejectedValueOnce(new Error('jobs down'));
    mockApi.getGatewayLogs.mockRejectedValueOnce(new Error('gateway down'));
    mockApi.getAuditSummary.mockRejectedValueOnce(new Error('audit down'));
    mockApi.getMetricsOverview.mockResolvedValueOnce({
      llm_api_key_configured: false,
      searchApiKeyConfigured: false,
      bilibiliEnabled: false,
      killSwitch: true,
      moderationEnabled: false,
    });
    mockApi.getObservabilitySummary.mockResolvedValueOnce({
      ok: true,
      summary: {
        nested_group: {
          latency_ms_p95: 88,
          empty_value: '',
        },
        recent_failures: ['a', 'b'],
        empty_list: [],
      },
    });
    mockApi.getReadinessStatus.mockRejectedValueOnce(new Error('readiness down'));

    await renderDashboard(container);

    expect(container.textContent).toContain('nested group latency ms p95');
    expect(container.textContent).toContain('recent failures');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('0');

    container.querySelector('#dashboard-refresh').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'info');
    expect(mockApi.getOverview).toHaveBeenCalledTimes(2);

    mockApi.getOverview.mockImplementationOnce(() => {
      throw new Error('sync overview down');
    });
    await renderDashboard(container);
    expect(container.textContent).toContain('sync overview down');
  });

  it('falls back when dashboard readiness is invalid and observability has no summary', async () => {
    const container = createPageContainer();
    mockApi.getMetricsOverview.mockResolvedValueOnce({});
    mockApi.getReadinessStatus.mockResolvedValueOnce([]);
    mockApi.getObservabilitySummary.mockResolvedValueOnce(null);

    await renderDashboard(container);

    expect(container.textContent).toContain('0');
    expect(container.querySelectorAll('.table-empty').length).toBeGreaterThanOrEqual(2);
  });

  it('covers dashboard boolean and scalar readiness signal fallbacks', async () => {
    const booleanContainer = createPageContainer();
    mockApi.getMetricsOverview.mockResolvedValueOnce({
      llm_provider: true,
      search_provider: false,
    });
    mockApi.getObservabilitySummary.mockResolvedValueOnce({ ok: true, summary: [] });

    await renderDashboard(booleanContainer);

    expect(booleanContainer.querySelectorAll('.table-empty').length).toBeGreaterThanOrEqual(1);

    const readinessContainer = createPageContainer();
    mockApi.getMetricsOverview.mockResolvedValueOnce({});
    mockApi.getReadinessStatus.mockResolvedValueOnce({
      foundation_ready: true,
      delivery_ready: false,
      foundation_blockers: 2,
      delivery_blockers: '3',
      delivery_capability_blockers: 0,
      effective_publish_mode: 'webhook',
    });

    await renderDashboard(readinessContainer);

    expect(readinessContainer.textContent).toContain('webhook');
    expect(readinessContainer.textContent).toContain('2');
    expect(readinessContainer.textContent).toContain('3');
  });

  it('covers dashboard count formatting when a readiness getter returns undefined late', async () => {
    const container = createPageContainer();
    let reads = 0;
    const readiness = {
      foundation_ready: true,
      delivery_ready: true,
      delivery_capability_blockers: [],
      effective_publish_mode: 'manual_queue',
    };
    Object.defineProperty(readiness, 'foundation_blockers', {
      enumerable: true,
      get() {
        reads += 1;
        return reads < 4 ? 0 : null;
      },
    });
    mockApi.getMetricsOverview.mockResolvedValueOnce({});
    mockApi.getReadinessStatus.mockResolvedValueOnce(readiness);

    await renderDashboard(container);

    expect(container.textContent).toContain('manual_queue');
    expect(reads).toBeGreaterThanOrEqual(4);
  });

  it('renders pet-core empty states, refreshes, records empty-note actions, and handles action failures', async () => {
    const container = createPageContainer();
    mockApi.getPetOverview.mockResolvedValue({
      item: {
        snapshot: {
          relationship: {},
          progress: {},
          needs: [],
          proactiveSignals: [],
        },
        companion: {
          recentInteractions: [],
        },
      },
    });

    await renderPetCore(container);

    expect(container.querySelectorAll('.table-empty')).toHaveLength(3);
    expect(container.textContent).toContain('-');

    container.querySelector('#pet-refresh').click();
    await flushPromises();
    expect(mockApi.getPetOverview).toHaveBeenCalledTimes(2);

    container.querySelector('[data-action="wake"]').click();
    await flushPromises();
    await flushPromises();
    expect(mockApi.recordPetAction).toHaveBeenCalledWith('wake', undefined);

    mockApi.recordPetAction.mockRejectedValueOnce(new Error('pet action down'));
    container.querySelector('[data-action="pat"]').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('pet action down'), 'error');

    const feedButton = container.querySelector('[data-action="feed"]');
    feedButton.removeAttribute('data-action');
    feedButton.click();
    await flushPromises();
    expect(mockApi.recordPetAction).toHaveBeenLastCalledWith('', undefined);
  });

  it('records pet-core actions when the optional note field is unavailable', async () => {
    const container = createPageContainer();
    const querySelector = container.querySelector.bind(container);
    container.querySelector = (selector) => (selector === '#pet-action-note' ? null : querySelector(selector));

    await renderPetCore(container);

    container.querySelector('[data-action="wake"]').click();
    await flushPromises();

    expect(mockApi.recordPetAction).toHaveBeenCalledWith('wake', undefined);
  });

  it('renders pet-core load failures into every panel', async () => {
    const container = createPageContainer();
    mockApi.getPetOverview.mockRejectedValueOnce(new Error('pet overview down'));

    await expect(renderPetCore(container)).rejects.toThrow('pet overview down');

    expect(container.querySelectorAll('.page-error')).toHaveLength(5);
    expect(container.textContent).toContain('pet overview down');
  });

  it('ignores empty jobs batch actions and deselects jobs through select-all', async () => {
    const container = createPageContainer();
    mockApi.getJobs.mockResolvedValue({
      items: [
        {
          id: 'job-empty-batch',
          status: 'published',
          comment_text: '',
          route_context: null,
          reply_text: '',
          risk_flags: [],
          created_at: null,
        },
      ],
    });

    await renderJobs(container);

    container.querySelector('#jobs-batch-approve').click();
    container.querySelector('#jobs-batch-retry').click();
    await flushPromises();
    expect(mockApi.batchApprove).not.toHaveBeenCalled();
    expect(mockApi.batchRetry).not.toHaveBeenCalled();

    const selectAll = container.querySelector('#jobs-select-all');
    selectAll.checked = true;
    selectAll.dispatchEvent(new Event('change'));
    expect(container.querySelector('#jobs-batch-bar').style.display).toBe('flex');

    selectAll.checked = false;
    selectAll.dispatchEvent(new Event('change'));
    expect(container.querySelector('#jobs-batch-bar').style.display).toBe('none');
  });

  it('guards role-card new navigation and no-ops status actions without selected card data', async () => {
    const container = createPageContainer();
    const originalConfirm = globalThis.confirm;
    globalThis.confirm = vi.fn(() => false);

    try {
      await renderRoleCards(container);

      container.querySelector('#rc-new').click();
      container.querySelector('#rc-key').value = 'draft-card';
      container.querySelector('#rc-key').dispatchEvent(new Event('input'));
      container.querySelector('#rc-new').click();

      expect(globalThis.confirm).toHaveBeenCalledTimes(1);

      container.querySelector('#rc-activate').click();
      container.querySelector('#rc-disable').click();
      await flushPromises();

      expect(mockApi.activateRoleCard).not.toHaveBeenCalled();
      expect(mockApi.disableRoleCard).not.toHaveBeenCalled();
    } finally {
      globalThis.confirm = originalConfirm;
    }
  });

  it('covers profile dirty states, no-op applies, load errors, and update failures', async () => {
    const container = createPageContainer();
    mockApi.getStyleProfile.mockResolvedValueOnce({ style: 'meme' });
    mockApi.getRoleProfile.mockResolvedValueOnce({ role: 'comfort' });

    await renderProfiles(container);

    const styleSelect = container.querySelector('#profile-style');
    const roleSelect = container.querySelector('#profile-role');
    const styleApply = container.querySelector('#profile-style-apply');
    const roleApply = container.querySelector('#profile-role-apply');

    styleSelect.value = 'normal';
    roleSelect.value = 'playful';
    styleSelect.dispatchEvent(new Event('change'));
    roleSelect.dispatchEvent(new Event('change'));
    expect(container.querySelector('#profile-pending-state').textContent).not.toContain('宸插悓姝');

    mockApi.setStyleProfile.mockRejectedValueOnce(new Error('style update down'));
    styleApply.click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('style update down'), 'error');

    mockApi.setRoleProfile.mockRejectedValueOnce(new Error('role update down'));
    roleApply.click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('role update down'), 'error');

    styleSelect.value = 'meme';
    styleApply.disabled = false;
    styleApply.click();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    roleSelect.value = 'comfort';
    roleApply.disabled = false;
    roleApply.click();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    mockApi.getStyleProfile.mockRejectedValueOnce(new Error('style load down'));
    mockApi.getRoleProfile.mockRejectedValueOnce(new Error('role load down'));
    container.querySelector('#profile-refresh').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('style load down'), 'error');
  });

  it('covers audit empty, failure, refresh, filters, and export error paths', async () => {
    const container = createPageContainer();
    mockApi.getAuditSummary.mockRejectedValueOnce(new Error('summary down'));
    mockApi.getAuditLogs.mockResolvedValueOnce({
      items: [{
        id: 987654321,
        action: 'retry',
        target_id: '',
        ok: false,
        detail: '',
        created_at: null,
      }],
    });

    await renderAudit(container);

    expect(container.textContent).toContain('retry');
    expect(container.textContent).toContain('摘要');

    mockApi.getAuditLogs.mockResolvedValueOnce({ items: [] });
    container.querySelector('#audit-filter-btn').click();
    await flushPromises();
    expect(container.querySelector('.table-empty')).toBeTruthy();

    mockApi.getAuditSummary.mockResolvedValueOnce({ total: 1, ok_count: 1, failed_count: 0 });
    mockApi.getAuditLogs.mockRejectedValueOnce(new Error('logs down'));
    container.querySelector('#audit-refresh').click();
    await flushPromises();
    expect(container.textContent).toContain('logs down');

    mockApi.exportAuditCsv.mockRejectedValueOnce(new Error('export down'));
    container.querySelector('#audit-export').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('export down'), 'error');
  });

  it('covers daily metrics aliases, large and non-numeric day normalization, presets, and enter reloads', async () => {
    const container = createPageContainer();
    mockApi.getDailyMetrics.mockResolvedValue({
      items: [{
        day: '2026-05-01',
        comment_count: '4',
        job_count: '3',
        published_count: '2',
        failed_count: '1',
        skipped_count: '0',
      }],
    });

    await renderDailyMetrics(container);

    expect(container.textContent).toContain('2026-05-01');

    container.querySelector('#metrics-days').value = '999';
    container.querySelector('#metrics-load').click();
    await flushPromises();
    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '365' });

    container.querySelector('#metrics-days').value = 'abc';
    container.querySelector('#metrics-load').click();
    await flushPromises();
    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '1' });

    container.querySelector('#metrics-days-7').click();
    await flushPromises();
    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '7' });

    container.querySelector('#metrics-days-30').click();
    await flushPromises();
    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '30' });

    container.querySelector('#metrics-days-90').click();
    await flushPromises();
    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '90' });

    container.querySelector('#metrics-days').value = '5';
    container.querySelector('#metrics-days').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flushPromises();
    expect(mockApi.getDailyMetrics).not.toHaveBeenLastCalledWith({ days: '5' });

    container.querySelector('#metrics-days').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await flushPromises();
    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '5' });
  });

  it('covers query history, keyboard, copy, missing ids, empty details, and error paths', async () => {
    const container = createPageContainer();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    sessionStorage.setItem('query_recent_comment_ids', JSON.stringify(['old-comment', '', 3]));
    sessionStorage.setItem('query_recent_job_ids', '{not-json');
    mockApi.getComments.mockResolvedValueOnce({
      total: 0,
      items: [{
        id: '',
        platform: '',
        source: '',
        content: '',
        route_context: null,
        created_at: null,
      }],
    });
    mockApi.getComment.mockResolvedValueOnce({});
    mockApi.getJob.mockResolvedValueOnce({ id: 'job-no-comment', status: 'done' });

    await renderQuery(container);

    expect(container.textContent).toContain('缺少 ID');

    container.querySelector('#query-job-btn').click();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    container.querySelector('#query-comment-id').value = 'comment-key';
    container.querySelector('#query-comment-id').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await flushPromises();
    expect(container.querySelector('#query-comment-copy').disabled).toBe(false);
    expect(container.textContent).toContain('未返回可展示字段');

    container.querySelector('#query-comment-copy').click();
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith('{}');
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'success');

    container.querySelector('[data-query-id="comment-key"]').click();
    await flushPromises();
    expect(mockApi.getComment).toHaveBeenLastCalledWith('comment-key');

    container.querySelector('#query-comment-clear').click();
    const commentCopyButton = container.querySelector('#query-comment-copy');
    commentCopyButton.disabled = false;
    commentCopyButton.click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    container.querySelector('#query-job-id').value = 'job-no-comment';
    container.querySelector('#query-job-id').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await flushPromises();
    expect(container.querySelector('#query-goto-comment')).toBeNull();

    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    container.querySelector('#query-job-copy').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    mockApi.getComment.mockRejectedValueOnce(new Error('comment down'));
    container.querySelector('#query-comment-id').value = 'bad-comment';
    container.querySelector('#query-comment-btn').click();
    await flushPromises();
    expect(container.textContent).toContain('comment down');

    mockApi.getJob.mockRejectedValueOnce(new Error('job down'));
    container.querySelector('#query-job-id').value = 'bad-job';
    container.querySelector('#query-job-btn').click();
    await flushPromises();
    expect(container.textContent).toContain('job down');

    mockApi.getComments.mockResolvedValueOnce({ items: [], total: 0 });
    container.querySelector('#query-comments-load').click();
    await flushPromises();
    expect(container.querySelector('.table-empty')).toBeTruthy();

    mockApi.getComments.mockRejectedValueOnce(new Error('comments down'));
    container.querySelector('#query-comments-load').click();
    await flushPromises();
    expect(container.textContent).toContain('comments down');
  });
});
