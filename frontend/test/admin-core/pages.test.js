import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer, flushPromises } from '../utils/dom.js';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getOverview: vi.fn(),
    getMetricsOverview: vi.fn(),
    getObservabilitySummary: vi.fn(),
    getReadinessStatus: vi.fn(),
    getPetOverview: vi.fn(),
    recordPetAction: vi.fn(),
    getPlatformConnections: vi.fn(),
    setPlatformConnectionControl: vi.fn(),
    getJobs: vi.fn(),
    getGatewayLogs: vi.fn(),
    getGatewayPublishLogs: vi.fn(),
    getAuditSummary: vi.fn(),
    getComments: vi.fn(),
    getComment: vi.fn(),
    getJob: vi.fn(),
    publishGatewayReply: vi.fn(),
    publishPlatformReply: vi.fn(),
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
  import('../../src/pages/pet-core.js'),
  import('../../src/pages/connections.js'),
  import('../../src/pages/role-cards.js'),
  import('../../src/pages/knowledge.js'),
  import('../../src/pages/memory.js'),
]);

const [
  { render: renderDashboard },
  { render: renderJobs },
  { render: renderQuery },
  { render: renderGateway },
  { render: renderPetCore },
  { render: renderConnections },
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
    mockApi.getPetOverview.mockResolvedValue({
      ok: true,
      item: {
        version: 'v2',
        snapshot: {
          relationship: { level: 'Growing', note: 'Bond is climbing.' },
          progress: { stage: 'settling', progressLabel: 'Settling loop', nextMilestone: 'Daily rituals' },
          needs: [{ key: 'energy', label: 'Energy', value: '80%' }],
          proactiveSignals: [{ key: 'snack', label: 'Snack reminder', detail: 'Feed soon.' }],
        },
        companion: {
          petName: 'Mochi',
          loopMode: 'Pet core companion',
          statusLine: 'Pet core is active.',
          adapterLabel: 'Pet core endpoint',
          recentInteractions: [
            {
              kind: 'pat',
              title: 'Pat interaction',
              detail: 'A gentle pat kept the loop stable.',
              source: 'Pet Core',
              timestamp: '2026-04-07T00:00:00.000Z',
            },
          ],
        },
      },
    });
    mockApi.recordPetAction.mockResolvedValue({ ok: true, action: 'feed', item_key: 'action:feed-latest' });
    mockApi.getPlatformConnections.mockResolvedValue({
      ok: true,
      items: [
        {
          platform: 'bilibili',
          adapterKey: 'bilibili-reference',
          status: 'connected',
          enabled: true,
          capabilities: [{ key: 'publish', status: 'available', note: 'bilibili-open' }],
        },
      ],
    });
    mockApi.getJobs.mockResolvedValue({
      items: [
        {
          id: 'job-12345678',
          status: 'pending_review',
          comment_text: '测试评论内容',
          route_context: {
            platform: 'qq',
            container_id: 'group-42',
            user_id: 'user-42',
            parent_external_id: 'message-root-42',
            chat_type: 'group',
          },
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
          platform: 'qq',
          source: 'qq',
          content: '列表中的评论',
          route_context: {
            platform: 'qq',
            container_id: 'group-7',
            user_id: 'user-7',
            parent_external_id: 'message-root-7',
            chat_type: 'group',
          },
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
    mockApi.publishPlatformReply.mockResolvedValue({ ok: true });
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
    expect(container.textContent).toContain('QQ群 group-42');
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
    expect(container.textContent).toContain('QQ群 group-7');

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

  it('publishes QQ route context from gateway page through the platform endpoint', async () => {
    const container = createPageContainer();

    await renderGateway(container);
    container.querySelector('#gw-platform').value = 'qq';
    container.querySelector('#gw-platform').dispatchEvent(new Event('change'));
    container.querySelector('#gw-comment-id').value = 'message-1';
    container.querySelector('#gw-canonical-id').value = 'qq:message-1';
    container.querySelector('#gw-container-id').value = 'group-7';
    container.querySelector('#gw-user-id').value = 'user-7';
    container.querySelector('#gw-parent-external-id').value = 'message-root-7';
    container.querySelector('#gw-chat-type').value = 'group';
    container.querySelector('#gw-adapter').value = 'napcat';
    container.querySelector('#gw-reply').value = 'hello qq';
    container.querySelector('#gw-publish-btn').click();
    await flushPromises();

    expect(mockApi.publishPlatformReply).toHaveBeenCalledWith('qq', {
      comment_id: 'message-1',
      canonical_id: 'qq:message-1',
      container_id: 'group-7',
      user_id: 'user-7',
      parent_external_id: 'message-root-7',
      routing_metadata: {
        chat_type: 'group',
        adapter: 'napcat',
      },
      reply_text: 'hello qq',
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
    expect(container.textContent).toContain('bilibili');
    expect(container.textContent).toContain('auth');
    expect(container.textContent).toContain('failed:1');
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

  it('renders the pet-core admin page with pet overview data', async () => {
    const container = createPageContainer();

    await renderPetCore(container);

    expect(container.textContent).toContain('宠物核心');
    expect(container.textContent).toContain('Growing');
    expect(container.textContent).toContain('Settling loop');
    expect(container.textContent).toContain('Snack reminder');
    expect(container.textContent).toContain('最近交互');
    expect(container.textContent).toContain('Pat interaction');
  });

  it('records a pet action from the pet-core admin page and refreshes the overview', async () => {
    const container = createPageContainer();

    await renderPetCore(container);
    container.querySelector('#pet-action-note').value = 'snack top-up';
    container.querySelector('[data-action="feed"]').click();
    await flushPromises();
    await flushPromises();

    expect(mockApi.recordPetAction).toHaveBeenCalledWith('feed', 'snack top-up');
    expect(mockApi.getPetOverview).toHaveBeenCalledTimes(2);
    expect(mockShowToast).toHaveBeenCalledWith('Feed 已记录', 'success');
  });

  it('renders the platform connections admin page', async () => {
    const container = createPageContainer();

    await renderConnections(container);

    expect(container.textContent).toContain('平台连接');
    expect(container.textContent).toContain('bilibili-reference');
    expect(container.textContent).toContain('connected');
  });

  it('toggles a platform trial from the connections page', async () => {
    const container = createPageContainer();

    await renderConnections(container);
    container.querySelector('[data-role="platform-toggle"]').click();
    await flushPromises();

    expect(mockApi.setPlatformConnectionControl).toHaveBeenCalledWith('bilibili', false);
  });
});
