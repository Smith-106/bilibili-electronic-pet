import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer, flushPromises } from '../utils/dom.js';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getAuditSummary: vi.fn(),
    getAuditLogs: vi.fn(),
    exportAuditCsv: vi.fn(),
    getDailyMetrics: vi.fn(),
    getStyleProfile: vi.fn(),
    setStyleProfile: vi.fn(),
    getRoleProfile: vi.fn(),
    setRoleProfile: vi.fn(),
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
  { render: renderProfiles },
] = await Promise.all([
  import('../../src/pages/audit.js'),
  import('../../src/pages/daily-metrics.js'),
  import('../../src/pages/profiles.js'),
]);

function resetMocks() {
  for (const mock of Object.values(mockApi)) {
    mock.mockReset();
  }
  mockShowToast.mockReset();
  mockApi.getAuditSummary.mockResolvedValue({ total: 1, ok_count: 1, failed_count: 0 });
  mockApi.getAuditLogs.mockResolvedValue({
    items: [
      {
        id: 100200300,
        action: 'approve',
        target_id: '',
        ok: false,
        detail: '',
        created_at: null,
      },
    ],
  });
  mockApi.exportAuditCsv.mockResolvedValue(undefined);
  mockApi.getDailyMetrics.mockResolvedValue({
    items: [
      {
        day: '2026-04-08',
        comment_count: '4',
        job_count: '3',
        published_count: '2',
        failed_count: '1',
        skipped_count: '0',
      },
    ],
  });
  mockApi.getStyleProfile.mockResolvedValue({ style: 'auto' });
  mockApi.getRoleProfile.mockResolvedValue({ role: 'default' });
  mockApi.setStyleProfile.mockResolvedValue({ ok: true });
  mockApi.setRoleProfile.mockResolvedValue({ ok: true });
}

describe('admin utility coverage branches', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('handles audit summary errors, empty logs, refresh, filter, and export errors', async () => {
    const container = createPageContainer();
    mockApi.getAuditSummary.mockRejectedValueOnce(new Error('summary down'));
    mockApi.getAuditLogs.mockResolvedValueOnce({ items: [] });

    await renderAudit(container);

    expect(container.querySelector('#audit-summary-cards .page-error')).toBeTruthy();
    expect(container.querySelector('#audit-table-wrapper .table-empty')).toBeTruthy();

    container.querySelector('#audit-action').value = 'retry';
    container.querySelector('#audit-ok').value = 'false';
    container.querySelector('#audit-limit').value = '5';
    container.querySelector('#audit-filter-btn').click();
    await flushPromises();
    expect(mockApi.getAuditLogs).toHaveBeenLastCalledWith({ action: 'retry', ok: 'false', limit: '5' });

    mockApi.getAuditSummary.mockResolvedValueOnce({ total: null, ok_count: null, failed_count: null });
    mockApi.getAuditLogs.mockResolvedValueOnce({ items: [] });
    container.querySelector('#audit-refresh').click();
    await flushPromises();
    expect(mockApi.getAuditSummary).toHaveBeenLastCalledWith({ days: 7 });

    mockApi.exportAuditCsv.mockRejectedValueOnce(new Error('export down'));
    container.querySelector('#audit-export').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('export down'), 'error');
  });

  it('normalizes large metric windows and exercises quick range and Enter handlers', async () => {
    const container = createPageContainer();

    await renderDailyMetrics(container);
    expect(container.textContent).toContain('2026-04-08');
    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '30' });

    container.querySelector('#metrics-days').value = '999';
    container.querySelector('#metrics-load').click();
    await flushPromises();
    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '365' });
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    container.querySelector('#metrics-days-7').click();
    await flushPromises();
    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '7' });

    container.querySelector('#metrics-days-30').click();
    await flushPromises();
    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '30' });

    container.querySelector('#metrics-days-90').click();
    await flushPromises();
    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '90' });

    container.querySelector('#metrics-days').value = '12';
    container.querySelector('#metrics-days').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flushPromises();
    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '90' });

    container.querySelector('#metrics-days').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await flushPromises();
    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '12' });
  });

  it('renders daily metrics from direct arrays and field fallbacks', async () => {
    const container = createPageContainer();
    mockApi.getDailyMetrics.mockResolvedValueOnce([
      {
        date: '',
        comments: undefined,
        jobs: undefined,
        published: undefined,
        failed: undefined,
        skipped: undefined,
      },
    ]);

    await renderDailyMetrics(container);

    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(container.textContent).toContain('0');
  });

  it('reports partial profile load failures and both dirty states', async () => {
    const container = createPageContainer();
    mockApi.getStyleProfile.mockResolvedValueOnce({});
    mockApi.getRoleProfile.mockRejectedValueOnce({});

    await renderProfiles(container);

    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('加载配置失败'), 'error');

    const styleSelect = container.querySelector('#profile-style');
    const roleSelect = container.querySelector('#profile-role');
    styleSelect.value = 'meme';
    roleSelect.value = 'comfort';
    styleSelect.dispatchEvent(new Event('change'));
    roleSelect.dispatchEvent(new Event('change'));

    expect(container.querySelector('#profile-style-apply').disabled).toBe(false);
    expect(container.querySelector('#profile-role-apply').disabled).toBe(false);
  });

  it('covers unchanged, success, and failure branches for applying profiles', async () => {
    const container = createPageContainer();

    await renderProfiles(container);

    const styleSelect = container.querySelector('#profile-style');
    const styleApply = container.querySelector('#profile-style-apply');
    const roleSelect = container.querySelector('#profile-role');
    const roleApply = container.querySelector('#profile-role-apply');

    styleApply.disabled = false;
    styleApply.click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    roleApply.disabled = false;
    roleApply.click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    mockApi.setStyleProfile.mockRejectedValueOnce(new Error('style down'));
    styleSelect.value = 'empathy';
    styleSelect.dispatchEvent(new Event('change'));
    styleApply.click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('style down'), 'error');

    mockApi.setRoleProfile.mockRejectedValueOnce(new Error('role down'));
    roleSelect.value = 'playful';
    roleSelect.dispatchEvent(new Event('change'));
    roleApply.click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('role down'), 'error');
  });

  it('renders audit and daily metrics non-array payload fallbacks', async () => {
    const auditContainer = createPageContainer();
    mockApi.getAuditLogs.mockResolvedValueOnce({ items: 'bad' });

    await renderAudit(auditContainer);

    expect(auditContainer.querySelector('#audit-table-wrapper .table-empty')).toBeTruthy();

    const metricsContainer = createPageContainer();
    mockApi.getDailyMetrics.mockResolvedValueOnce({ items: 'bad' });

    await renderDailyMetrics(metricsContainer);

    expect(metricsContainer.querySelector('.table-empty')).toBeTruthy();
  });

  it('uses profile load fallback messages for rejected and empty responses', async () => {
    const container = createPageContainer();
    mockApi.getStyleProfile.mockRejectedValueOnce({});
    mockApi.getRoleProfile.mockResolvedValueOnce({});

    await renderProfiles(container);

    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('加载配置失败'), 'error');
  });
});
