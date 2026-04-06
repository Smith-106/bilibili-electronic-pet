import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer, flushPromises } from '../utils/dom.js';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getOverview: vi.fn(),
    getJobs: vi.fn(),
    getGatewayLogs: vi.fn(),
    getAuditSummary: vi.fn(),
    getComment: vi.fn(),
    getJob: vi.fn(),
    publishGatewayReply: vi.fn(),
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
  import('../../src/pages/dashboard.js'),
  import('../../src/pages/jobs.js'),
  import('../../src/pages/query.js'),
  import('../../src/pages/gateway.js'),
]);

const [{ render: renderDashboard }, { render: renderJobs }, { render: renderQuery }, { render: renderGateway }] = pages;

describe('admin-core frontend regression tests', () => {
  beforeEach(() => {
    mockApi.getOverview.mockResolvedValue({
      total_comments: 12,
      total_jobs: 7,
      total_published: 3,
      pending_review: 2,
      total_failed: 1,
    });
    mockApi.getJobs.mockResolvedValue({
      items: [
        {
          id: 'job-12345678',
          status: 'pending_review',
          comment_text: '测试评论内容',
          reply_text: '测试回复',
          risk_flags: [],
          created_at: '2026-04-07T00:00:00.000Z',
        },
      ],
    });
    mockApi.getGatewayLogs.mockResolvedValue({
      items: [
        {
          id: 1,
          comment_id: 'comment-1',
          status: 'published',
          platform: 'bilibili',
          reply_text: 'hello',
          created_at: '2026-04-07T00:00:00.000Z',
        },
      ],
    });
    mockApi.getAuditSummary.mockResolvedValue({
      total: 10,
      ok_count: 8,
      failed_count: 2,
    });
    mockApi.getComment.mockResolvedValue({
      ok: true,
      comment_id: 'comment-1',
      content: '评论详情',
    });
    mockApi.getJob.mockResolvedValue({
      id: 'job-12345678',
      comment_id: 'comment-1',
      status: 'published',
    });
    mockApi.publishGatewayReply.mockResolvedValue({ ok: true });
  });

  it('renders dashboard with summary counters', async () => {
    const container = createPageContainer();

    await renderDashboard(container);

    expect(container.textContent).toContain('系统概览');
    expect(container.textContent).toContain('评论总数');
    expect(container.textContent).toContain('12');
    expect(container.textContent).toContain('测试评论内容');
  });

  it('renders jobs list from mocked admin API', async () => {
    const container = createPageContainer();

    await renderJobs(container);

    expect(mockApi.getJobs).toHaveBeenCalled();
    expect(container.textContent).toContain('任务管理');
    expect(container.textContent).toContain('测试评论内容');
    expect(container.querySelector('.job-approve')).toBeTruthy();
  });

  it('queries comment details via query page controls', async () => {
    const container = createPageContainer();

    await renderQuery(container);
    container.querySelector('#query-comment-id').value = 'comment-1';
    container.querySelector('#query-comment-btn').click();
    await flushPromises();

    expect(mockApi.getComment).toHaveBeenCalledWith('comment-1');
    expect(container.textContent).toContain('评论详情');
  });

  it('publishes from gateway page and refreshes logs', async () => {
    const container = createPageContainer();

    await renderGateway(container);
    container.querySelector('#gw-comment-id').value = 'comment-1';
    container.querySelector('#gw-reply').value = 'hello world';
    container.querySelector('#gw-publish-btn').click();
    await flushPromises();

    expect(mockApi.publishGatewayReply).toHaveBeenCalledWith({
      comment_id: 'comment-1',
      reply_text: 'hello world',
      source: 'manual',
      force_publish: false,
    });
    expect(mockShowToast).toHaveBeenCalledWith('发布成功', 'success');
  });
});
