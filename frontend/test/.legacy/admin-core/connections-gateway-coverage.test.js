import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer, flushPromises } from '../utils/dom.js';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getPlatformConnections: vi.fn(),
    setPlatformConnectionControl: vi.fn(),
    getGatewayLogs: vi.fn(),
    getGatewayPublishLogs: vi.fn(),
    publishGatewayReply: vi.fn(),
    publishPlatformReply: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('../../src/api/admin.js', () => ({
  createAdminApi: () => mockApi,
}));

vi.mock('../../src/components/toast.js', () => ({
  showToast: mockShowToast,
}));

const [{ render: renderConnections }, { render: renderGateway }] = await Promise.all([
  import('../../src/pages/connections.js'),
  import('../../src/pages/gateway.js'),
]);

function resetMocks() {
  for (const mock of Object.values(mockApi)) {
    mock.mockReset();
  }
  mockShowToast.mockReset();
  mockApi.getPlatformConnections.mockResolvedValue({
    items: [
      {
        platform: 'bilibili',
        adapterKey: 'bili-adapter',
        status: 'connected',
        enabled: true,
        capabilities: [{ key: 'publish', status: 'ok', note: 'ready' }],
      },
    ],
  });
  mockApi.setPlatformConnectionControl.mockResolvedValue({ ok: true });
  mockApi.getGatewayLogs.mockResolvedValue({
    items: [
      {
        id: 123456789,
        comment_id: 'comment-123456789',
        status: 'published',
        platform: 'bilibili',
        reply_text: 'reply text',
        created_at: '2026-04-07T00:00:00.000Z',
      },
    ],
  });
  mockApi.getGatewayPublishLogs.mockResolvedValue({
    total: 1,
    items: [
      {
        comment_id: 'comment-1',
        platform: 'bilibili',
        status: 'published',
        source: 'manual',
        failure_reason: '',
        reply_hash: '',
        published_at: '2026-04-07T00:00:00.000Z',
        created_at: '2026-04-07T00:00:00.000Z',
      },
    ],
  });
  mockApi.publishGatewayReply.mockResolvedValue({ ok: true });
  mockApi.publishPlatformReply.mockResolvedValue({ ok: true });
}

describe('connections and gateway coverage branches', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('renders empty connection state and refreshes connection cards', async () => {
    const container = createPageContainer();
    mockApi.getPlatformConnections.mockResolvedValueOnce({ items: [] });

    await renderConnections(container);
    expect(container.querySelector('#connections-wrapper .table-empty')).toBeTruthy();

    mockApi.getPlatformConnections.mockResolvedValueOnce({
      items: [
        {
          platform: '',
          adapterKey: '',
          status: '',
          enabled: false,
          capabilities: [{ key: '', status: '', note: '' }],
        },
      ],
    });
    container.querySelector('#connections-refresh').click();
    await flushPromises();

    expect(mockApi.getPlatformConnections).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-role="platform-toggle"]').getAttribute('data-enabled')).toBe('true');

    container.querySelector('[data-role="platform-toggle"]').click();
    await flushPromises();
    expect(mockApi.setPlatformConnectionControl).toHaveBeenLastCalledWith('', true);
  });

  it('toggles disabled connections back on', async () => {
    const container = createPageContainer();
    mockApi.getPlatformConnections.mockResolvedValue({
      items: [{ platform: 'qq', adapterKey: null, status: null, enabled: false, capabilities: [] }],
    });

    await renderConnections(container);
    container.querySelector('[data-role="platform-toggle"]').click();
    await flushPromises();

    expect(mockApi.setPlatformConnectionControl).toHaveBeenCalledWith('qq', true);
    expect(mockApi.getPlatformConnections).toHaveBeenCalledTimes(2);
  });

  it('validates gateway publish fields and updates the character counter', async () => {
    const container = createPageContainer();

    await renderGateway(container);
    container.querySelector('#gw-reply').value = 'hello';
    container.querySelector('#gw-reply').dispatchEvent(new Event('input'));
    expect(container.querySelector('#gw-char-count').textContent).toContain('5');

    container.querySelector('#gw-publish-btn').click();
    await flushPromises();

    expect(mockApi.publishGatewayReply).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');
  });

  it('publishes non-qq platform payloads and clears common fields', async () => {
    const container = createPageContainer();

    await renderGateway(container);
    container.querySelector('#gw-platform').value = 'douyin';
    container.querySelector('#gw-platform').dispatchEvent(new Event('change'));
    expect(container.querySelector('#gw-qq-route-fields').style.display).toBe('none');
    container.querySelector('#gw-comment-id').value = 'dy-comment';
    container.querySelector('#gw-source').value = 'operator';
    container.querySelector('#gw-reply').value = 'douyin reply';
    container.querySelector('#gw-force').checked = true;
    container.querySelector('#gw-publish-btn').click();
    await flushPromises();

    expect(mockApi.publishPlatformReply).toHaveBeenCalledWith('douyin', {
      comment_id: 'dy-comment',
      reply_text: 'douyin reply',
      source: 'operator',
      force_publish: true,
    });
    expect(container.querySelector('#gw-comment-id').value).toBe('');
    expect(container.querySelector('#gw-reply').value).toBe('');
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'success');
  });

  it('publishes qq payloads without optional route metadata when fields are blank', async () => {
    const container = createPageContainer();

    await renderGateway(container);
    container.querySelector('#gw-platform').value = 'qq';
    container.querySelector('#gw-platform').dispatchEvent(new Event('change'));
    expect(container.querySelector('#gw-qq-route-fields').style.display).toBe('block');
    container.querySelector('#gw-comment-id').value = 'qq-comment';
    container.querySelector('#gw-adapter').value = '';
    container.querySelector('#gw-reply').value = 'qq reply';
    container.querySelector('#gw-publish-btn').click();
    await flushPromises();

    expect(mockApi.publishPlatformReply).toHaveBeenCalledWith('qq', {
      comment_id: 'qq-comment',
      reply_text: 'qq reply',
      source: 'manual',
      force_publish: false,
    });
    expect(container.querySelector('#gw-chat-type').value).toBe('');
  });

  it('reports gateway publish errors and restores the button state', async () => {
    const container = createPageContainer();
    mockApi.publishGatewayReply.mockRejectedValueOnce(new Error('publish down'));

    await renderGateway(container);
    container.querySelector('#gw-comment-id').value = 'bili-comment';
    container.querySelector('#gw-reply').value = 'reply';
    container.querySelector('#gw-publish-btn').click();
    await flushPromises();

    const publishButton = container.querySelector('#gw-publish-btn');
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('publish down'), 'error');
    expect(publishButton.disabled).toBe(false);
    expect(publishButton.textContent).toContain('发布');
  });

  it('renders gateway empty states and load errors', async () => {
    const container = createPageContainer();
    mockApi.getGatewayLogs.mockResolvedValueOnce({ items: [] });
    mockApi.getGatewayPublishLogs.mockResolvedValueOnce({ total: 'bad', items: [] });

    await renderGateway(container);

    expect(container.querySelector('#gw-events-wrapper .table-empty')).toBeTruthy();
    expect(container.querySelector('#gw-publish-wrapper .table-empty')).toBeTruthy();
    expect(container.querySelector('#gw-publish-meta').textContent).toContain('0 / 0');

    mockApi.getGatewayLogs.mockRejectedValueOnce(new Error('gateway logs down'));
    mockApi.getGatewayPublishLogs.mockRejectedValueOnce(new Error('publish logs down'));
    container.querySelector('#gw-refresh').click();
    await flushPromises();

    expect(container.querySelector('#gw-events-wrapper .page-error').textContent).toContain('gateway logs down');
    expect(container.querySelector('#gw-publish-wrapper .page-error').textContent).toContain('publish logs down');
  });

  it('renders publish log fallbacks from canonical ids and filters by status', async () => {
    const container = createPageContainer();
    mockApi.getGatewayLogs.mockResolvedValueOnce({
      items: [{ id: null, comment_id: null, status: '', platform: '', reply_text: '', created_at: null }],
    });
    mockApi.getGatewayPublishLogs.mockResolvedValueOnce({
      items: [
        {
          canonical_comment_id: 'canonical-comment',
          platform: '',
          status: '',
          source: '',
          failure_reason: '',
          reply_hash: 'abcdef123456',
          published_at: null,
          created_at: null,
        },
      ],
    });

    await renderGateway(container);
    expect(container.textContent).toContain('canonical-comment'.substring(0, 16));

    container.querySelector('#gw-status').value = 'failed';
    container.querySelector('#gw-limit').value = '7';
    container.querySelector('#gw-filter-btn').click();
    await flushPromises();

    expect(mockApi.getGatewayPublishLogs).toHaveBeenLastCalledWith({ limit: '7', status: 'failed' });
  });

  it('renders connection and gateway non-array fallback payloads', async () => {
    const connectionsContainer = createPageContainer();
    mockApi.getPlatformConnections.mockResolvedValueOnce({
      items: [{ platform: 'missing-capabilities', enabled: true }],
    });

    await renderConnections(connectionsContainer);

    expect(connectionsContainer.textContent).toContain('missing-capabilities');

    const gatewayContainer = createPageContainer();
    mockApi.getGatewayLogs.mockResolvedValueOnce({ items: 'bad' });
    mockApi.getGatewayPublishLogs.mockResolvedValueOnce({
      total: undefined,
      items: [
        {
          comment_id: '',
          canonical_comment_id: '',
          platform: '',
          status: '',
          source: '',
          failure_reason: '',
          reply_hash: '',
          published_at: null,
          created_at: null,
        },
      ],
    });

    await renderGateway(gatewayContainer);

    expect(gatewayContainer.querySelector('#gw-events-wrapper .table-empty')).toBeTruthy();
    expect(gatewayContainer.querySelector('#gw-publish-wrapper tbody tr')).toBeTruthy();

    mockApi.getGatewayLogs.mockResolvedValueOnce({ items: [] });
    mockApi.getGatewayPublishLogs.mockResolvedValueOnce({ items: 'bad' });
    gatewayContainer.querySelector('#gw-refresh').click();
    await flushPromises();

    expect(gatewayContainer.querySelector('#gw-publish-wrapper .table-empty')).toBeTruthy();
  });
});
