import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer, flushPromises } from '../utils/dom.js';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getOverview: vi.fn(),
    getMetricsOverview: vi.fn(),
    getObservabilitySummary: vi.fn(),
    getReadinessStatus: vi.fn(),
    getJobs: vi.fn(),
    getGatewayLogs: vi.fn(),
    getGatewayPublishLogs: vi.fn(),
    getAuditSummary: vi.fn(),
    getComments: vi.fn(),
    getComment: vi.fn(),
    getJob: vi.fn(),
    publishGatewayReply: vi.fn(),
    getRoleCards: vi.fn(),
    activateRoleCard: vi.fn(),
    getKnowledgeEntries: vi.fn(),
    createKnowledgeEntry: vi.fn(),
    getMemorySpaces: vi.fn(),
    createMemorySpace: vi.fn(),
    getMemoryGrants: vi.fn(),
    grantMemorySpaceAccess: vi.fn(),
    getMemoryIdentityLinks: vi.fn(),
    linkMemoryIdentity: vi.fn(),
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
  import('../../src/pages/role-cards.js'),
  import('../../src/pages/knowledge.js'),
  import('../../src/pages/memory.js'),
]);

const [
  { render: renderDashboard },
  { render: renderJobs },
  { render: renderQuery },
  { render: renderGateway },
  { render: renderRoleCards },
  { render: renderKnowledge },
  { render: renderMemory },
] = pages;

describe('admin-core frontend regression tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    for (const mock of Object.values(mockApi)) {
      mock.mockReset();
    }
    mockShowToast.mockReset();

    mockApi.getOverview.mockResolvedValue({
      total_comments: 12,
      total_jobs: 7,
      total_published: 3,
      pending_review: 2,
      total_failed: 1,
    });
    mockApi.getMetricsOverview.mockResolvedValue({
      llm_provider: 'openai',
      search_provider: 'serpapi',
      publisher_mode: 'real_publish',
      llmApiKeyConfigured: true,
      publisherWebhookUrlConfigured: true,
      bilibiliEnabled: true,
      bilibiliPublishEnabled: true,
      killSwitch: false,
    });
    mockApi.getObservabilitySummary.mockResolvedValue({
      ok: true,
      summary: {
        window_minutes: 120,
        published_count: 3,
        failed_count: 1,
        latency_ms_p95: 420,
      },
    });
    mockApi.getReadinessStatus.mockResolvedValue({
      foundation_ready: true,
      delivery_ready: true,
      foundation_blockers: [],
      delivery_blockers: [],
      delivery_capability_blockers: [],
      bilibili_diagnostics: {
        effective_publish_mode: 'native_bilibili',
      },
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
    mockApi.getGatewayPublishLogs.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 88,
          comment_id: 'comment-1',
          canonical_comment_id: 'bilibili:comment-1',
          source: 'real_publish',
          status: 'failed',
          failure_reason: 'auth',
          reply_hash: 'abcdef1234567890',
          created_at: '2026-04-07T00:00:00.000Z',
          published_at: null,
        },
      ],
    });
    mockApi.getAuditSummary.mockResolvedValue({
      total: 10,
      ok_count: 8,
      failed_count: 2,
    });
    mockApi.getComments.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 1,
          canonical_comment_id: 'comment-1',
          comment_id: 'comment-1',
          platform: 'bilibili',
          source: 'native_bilibili',
          content: '列表中的评论',
          created_at: '2026-04-07T00:00:00.000Z',
        },
      ],
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
    mockApi.getRoleCards.mockResolvedValue({
      items: [
        {
          key: 'disabled-card',
          name: '已禁用角色',
          description: 'for test',
          system_prompt: 'prompt',
          tone: 'gentle',
          constraints: '{}',
          enabled: false,
        },
      ],
    });
    mockApi.activateRoleCard.mockResolvedValue({ ok: true });
    mockApi.getKnowledgeEntries.mockResolvedValue({ items: [] });
    mockApi.createKnowledgeEntry.mockResolvedValue({ ok: true });
    mockApi.getMemorySpaces.mockResolvedValue({ items: [] });
    mockApi.createMemorySpace.mockResolvedValue({ ok: true });
    mockApi.getMemoryGrants.mockResolvedValue({ items: [] });
    mockApi.grantMemorySpaceAccess.mockResolvedValue({ ok: true });
    mockApi.getMemoryIdentityLinks.mockResolvedValue({ items: [] });
    mockApi.linkMemoryIdentity.mockResolvedValue({ ok: true });
  });

  it('renders dashboard with summary counters plus runtime and observability insights', async () => {
    const container = createPageContainer();

    await renderDashboard(container);

    expect(container.textContent).toContain('系统概览');
    expect(container.textContent).toContain('评论总数');
    expect(container.textContent).toContain('12');
    expect(container.textContent).toContain('测试评论内容');
    expect(container.textContent).toContain('运行时能力');
    expect(container.textContent).toContain('可观测性摘要');
    expect(container.textContent).toContain('LLM 提供方');
    expect(container.textContent).toContain('openai');
  });

  it('falls back to readiness-derived runtime signals and a friendly empty observability state', async () => {
    const container = createPageContainer();
    mockApi.getMetricsOverview.mockResolvedValueOnce({
      total_comments: 12,
      total_jobs: 7,
    });
    mockApi.getObservabilitySummary.mockResolvedValueOnce({ ok: true, summary: {} });

    await renderDashboard(container);

    expect(container.textContent).toContain('发布模式');
    expect(container.textContent).toContain('native_bilibili');
    expect(container.textContent).toContain('基础就绪');
    expect(container.textContent).toContain('交付就绪');
    expect(container.textContent).toContain('当前窗口暂无可观测数据');
    expect(container.textContent).not.toContain('未返回运行时配置摘要');
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

  it('loads the comment browser and opens a comment from the list', async () => {
    const container = createPageContainer();

    await renderQuery(container);

    expect(mockApi.getComments).toHaveBeenCalledWith({ limit: '10', offset: '0' });

    container.querySelector('.query-comment-open').click();
    await flushPromises();

    expect(mockApi.getComment).toHaveBeenCalledWith('comment-1');
    expect(container.textContent).toContain('列表中的评论');
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

  it('loads gateway publish diagnostics with the active status filter', async () => {
    const container = createPageContainer();

    await renderGateway(container);
    container.querySelector('#gw-status').value = 'failed';
    container.querySelector('#gw-filter-btn').click();
    await flushPromises();

    expect(mockApi.getGatewayPublishLogs).toHaveBeenLastCalledWith({ limit: '20', status: 'failed' });
    expect(container.textContent).toContain('发布日志诊断');
    expect(container.textContent).toContain('auth');
  });

  it('shows activate action for disabled role cards and triggers reactivation', async () => {
    const container = createPageContainer();

    await renderRoleCards(container);
    const select = container.querySelector('#rc-select');
    select.value = 'disabled-card';
    select.dispatchEvent(new Event('change'));
    await flushPromises();

    const activateBtn = container.querySelector('#rc-activate');
    const disableBtn = container.querySelector('#rc-disable');

    expect(activateBtn.style.display).toBe('inline-flex');
    expect(disableBtn.style.display).toBe('none');

    activateBtn.click();
    await flushPromises();

    expect(mockApi.activateRoleCard).toHaveBeenCalledWith('disabled-card');
    expect(mockShowToast).toHaveBeenCalledWith('已激活', 'success');
  });

  it('blocks knowledge creation when category is missing', async () => {
    const container = createPageContainer();

    await renderKnowledge(container);
    container.querySelector('#knowledge-title').value = '标题';
    container.querySelector('#knowledge-content').value = '内容';
    container.querySelector('#knowledge-create').click();
    await flushPromises();

    expect(mockApi.createKnowledgeEntry).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith('分类、标题和内容不能为空', 'warning');
  });

  it('renders the memory admin page shell', async () => {
    const container = createPageContainer();

    await renderMemory(container);

    expect(container.textContent).toContain('Memory 管理');
    expect(container.textContent).toContain('新增 Space');
    expect(mockApi.getMemorySpaces).toHaveBeenCalledWith({ limit: 50 });
  });
});
