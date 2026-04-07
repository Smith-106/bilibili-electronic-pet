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
    getComment: vi.fn(),
    getJob: vi.fn(),
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
  import('../../src/pages/query.js'),
]);

const [
  { render: renderAudit },
  { render: renderDailyMetrics },
  { render: renderProfiles },
  { render: renderQuery },
] = pages;

describe('admin utility-page regression tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
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
    mockApi.getComment.mockResolvedValue({ id: 'c-1', content: 'hello' });
    mockApi.getJob.mockResolvedValue({ id: 'j-1', status: 'queued', comment_id: 'c-1' });
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

  it('renders daily metrics rows and summary from mocked data', async () => {
    const container = createPageContainer();

    await renderDailyMetrics(container);

    expect(mockApi.getDailyMetrics).toHaveBeenCalledWith({ days: '30' });
    expect(container.textContent).toContain('每日指标');
    expect(container.textContent).toContain('2026-04-07');
    expect(container.textContent).toContain('最近 30 天合计');
  });

  it('normalizes invalid day range and warns operator', async () => {
    const container = createPageContainer();

    await renderDailyMetrics(container);
    mockShowToast.mockReset();

    container.querySelector('#metrics-days').value = '0';
    container.querySelector('#metrics-load').click();
    await flushPromises();

    expect(mockApi.getDailyMetrics).toHaveBeenLastCalledWith({ days: '1' });
    expect(mockShowToast).toHaveBeenCalledWith('天数必须在 1-365 之间，已自动调整为 1', 'warning');
  });

  it('shows the empty state when no daily metrics exist', async () => {
    const container = createPageContainer();
    mockApi.getDailyMetrics.mockResolvedValueOnce([]);

    await renderDailyMetrics(container);

    expect(container.textContent).toContain('暂无指标数据');
    expect(container.textContent).toContain('最近 30 天暂无可展示指标');
  });

  it('shows an error state when daily metrics loading fails', async () => {
    const container = createPageContainer();
    mockApi.getDailyMetrics.mockRejectedValueOnce(new Error('metrics_down'));

    await renderDailyMetrics(container);

    expect(container.textContent).toContain('加载失败: metrics_down');
    expect(mockShowToast).toHaveBeenCalledWith('加载每日指标失败: metrics_down', 'error');
  });

  it('loads current profile values, tracks dirty state, and applies updates', async () => {
    const container = createPageContainer();

    await renderProfiles(container);

    const styleSelect = container.querySelector('#profile-style');
    const styleApply = container.querySelector('#profile-style-apply');
    const roleSelect = container.querySelector('#profile-role');
    const roleApply = container.querySelector('#profile-role-apply');

    expect(styleApply.disabled).toBe(true);
    expect(roleApply.disabled).toBe(true);
    expect(container.querySelector('#profile-pending-state').textContent).toContain('已同步');

    styleSelect.value = 'normal';
    styleSelect.dispatchEvent(new Event('change'));
    expect(styleApply.disabled).toBe(false);
    styleApply.click();
    await flushPromises();

    roleSelect.value = 'playful';
    roleSelect.dispatchEvent(new Event('change'));
    expect(roleApply.disabled).toBe(false);
    roleApply.click();
    await flushPromises();

    expect(mockApi.setStyleProfile).toHaveBeenCalledWith('normal');
    expect(mockApi.setRoleProfile).toHaveBeenCalledWith('playful');
    expect(mockShowToast).toHaveBeenCalledWith('风格已更新', 'success');
    expect(mockShowToast).toHaveBeenCalledWith('角色配置已更新', 'success');
    expect(container.querySelector('#profile-pending-state').textContent).toContain('已同步');
  });

  it('refreshes profile config and reports refresh feedback', async () => {
    const container = createPageContainer();

    await renderProfiles(container);
    mockShowToast.mockReset();

    container.querySelector('#profile-refresh').click();
    await flushPromises();

    expect(mockApi.getStyleProfile).toHaveBeenCalledTimes(2);
    expect(mockApi.getRoleProfile).toHaveBeenCalledTimes(2);
    expect(mockShowToast).toHaveBeenCalledWith('已从服务端刷新配置', 'success');
  });

  it('renders query page and links job detail to comment detail lookup', async () => {
    const container = createPageContainer();

    await renderQuery(container);

    container.querySelector('#query-job-id').value = 'job-1';
    container.querySelector('#query-job-btn').click();
    await flushPromises();
    expect(mockApi.getJob).toHaveBeenCalledWith('job-1');
    expect(container.textContent).toContain('查询成功');

    container.querySelector('#query-goto-comment').click();
    await flushPromises();
    expect(mockApi.getComment).toHaveBeenCalledWith('c-1');
  });

  it('warns when query id is empty and clears result panel', async () => {
    const container = createPageContainer();

    await renderQuery(container);

    container.querySelector('#query-comment-btn').click();
    expect(mockShowToast).toHaveBeenCalledWith('请输入 Comment ID', 'warning');

    container.querySelector('#query-job-id').value = 'job-1';
    container.querySelector('#query-job-btn').click();
    await flushPromises();
    expect(container.querySelector('#query-job-copy').disabled).toBe(false);

    container.querySelector('#query-job-clear').click();
    expect(container.querySelector('#query-job-result').innerHTML).toBe('');
    expect(container.querySelector('#query-job-copy').disabled).toBe(true);
  });

  it('shows an error state when audit log loading fails', async () => {
    const container = createPageContainer();
    mockApi.getAuditLogs.mockRejectedValueOnce(new Error('request_failed'));

    await renderAudit(container);

    expect(container.textContent).toContain('加载失败: request_failed');
  });
});
