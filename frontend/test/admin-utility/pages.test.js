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

const pages = await Promise.all([
  import('../../src/pages/audit.js'),
  import('../../src/pages/daily-metrics.js'),
  import('../../src/pages/profiles.js'),
]);

const [
  { render: renderAudit },
  { render: renderDailyMetrics },
  { render: renderProfiles },
] = pages;

describe('admin utility-page regression tests', () => {
  beforeEach(() => {
    mockApi.getAuditSummary.mockResolvedValue({
      total: 10,
      ok_count: 8,
      failed_count: 2,
    });
    mockApi.getAuditLogs.mockResolvedValue({
      items: [
        {
          id: 12345678,
          action: 'approve',
          target_id: 'job-1',
          ok: true,
          detail: 'done',
          created_at: '2026-04-07T00:00:00.000Z',
        },
      ],
    });
    mockApi.exportAuditCsv.mockResolvedValue(undefined);
    mockApi.getDailyMetrics.mockResolvedValue({
      items: [
        {
          date: '2026-04-07',
          comments: 4,
          jobs: 3,
          published: 2,
          failed: 1,
          skipped: 0,
        },
      ],
    });
    mockApi.getStyleProfile.mockResolvedValue({ style: 'meme' });
    mockApi.getRoleProfile.mockResolvedValue({ role: 'comfort' });
    mockApi.setStyleProfile.mockResolvedValue({ ok: true });
    mockApi.setRoleProfile.mockResolvedValue({ ok: true });
    mockShowToast.mockReset();
  });

  it('renders audit summary and log rows from mocked admin api', async () => {
    const container = createPageContainer();

    await renderAudit(container);

    expect(mockApi.getAuditSummary).toHaveBeenCalledWith({ days: 7 });
    expect(mockApi.getAuditLogs).toHaveBeenCalledWith({ action: '', ok: '', limit: '30' });
    expect(container.textContent).toContain('审计日志');
    expect(container.textContent).toContain('总操作');
    expect(container.textContent).toContain('approve');
  });

  it('exports audit csv with the active filters', async () => {
    const container = createPageContainer();

    await renderAudit(container);

    container.querySelector('#audit-action').value = 'retry';
    container.querySelector('#audit-ok').value = 'false';
    container.querySelector('#audit-limit').value = '50';
    container.querySelector('#audit-export').click();
    await flushPromises();

    expect(mockApi.exportAuditCsv).toHaveBeenCalledWith({
      action: 'retry',
      ok: 'false',
      limit: '50',
    });
    expect(mockShowToast).toHaveBeenCalledWith('导出成功', 'success');
  });

  it('renders daily metrics rows from mocked data', async () => {
    const container = createPageContainer();

    await renderDailyMetrics(container);

    expect(mockApi.getDailyMetrics).toHaveBeenCalledWith({ days: '30' });
    expect(container.textContent).toContain('每日指标');
    expect(container.textContent).toContain('2026-04-07');
    expect(container.textContent).toContain('4');
  });

  it('shows the empty state when no daily metrics exist', async () => {
    const container = createPageContainer();
    mockApi.getDailyMetrics.mockResolvedValueOnce([]);

    await renderDailyMetrics(container);

    expect(container.textContent).toContain('暂无指标数据');
  });

  it('loads current profile values and applies updates', async () => {
    const container = createPageContainer();

    await renderProfiles(container);

    expect(mockApi.getStyleProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.getRoleProfile).toHaveBeenCalledTimes(1);
    expect(container.querySelector('#profile-style').value).toBe('meme');
    expect(container.querySelector('#profile-role').value).toBe('comfort');

    container.querySelector('#profile-style').value = 'normal';
    container.querySelector('#profile-style-apply').click();
    await flushPromises();

    container.querySelector('#profile-role').value = 'playful';
    container.querySelector('#profile-role-apply').click();
    await flushPromises();

    expect(mockApi.setStyleProfile).toHaveBeenCalledWith('normal');
    expect(mockApi.setRoleProfile).toHaveBeenCalledWith('playful');
    expect(mockShowToast).toHaveBeenCalledWith('风格已更新', 'success');
    expect(mockShowToast).toHaveBeenCalledWith('角色配置已更新', 'success');
  });

  it('shows an error state when audit log loading fails', async () => {
    const container = createPageContainer();
    mockApi.getAuditLogs.mockRejectedValueOnce(new Error('request_failed'));

    await renderAudit(container);

    expect(container.textContent).toContain('加载失败: request_failed');
  });
});
