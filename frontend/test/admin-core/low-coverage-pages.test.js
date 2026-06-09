import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer, flushPromises } from '../utils/dom.js';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getJobs: vi.fn(),
    approveJob: vi.fn(),
    retryJob: vi.fn(),
    batchApprove: vi.fn(),
    batchRetry: vi.fn(),
    exportJobsCsv: vi.fn(),
    getKnowledgeEntries: vi.fn(),
    createKnowledgeEntry: vi.fn(),
    disableKnowledgeEntry: vi.fn(),
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
  { render: renderJobs },
  { render: renderKnowledge },
  { render: renderRoleCards },
] = await Promise.all([
  import('../../src/pages/jobs.js'),
  import('../../src/pages/knowledge.js'),
  import('../../src/pages/role-cards.js'),
]);

const jobA = {
  id: 'job-alpha-1234',
  status: 'pending_review',
  comment_text: '<comment alpha>',
  route_context: {
    platform: 'qq',
    container_id: 'group-1',
    user_id: 'user-1',
    parent_external_id: 'root-1',
    chat_type: 'group',
  },
  reply_text: 'reply alpha',
  risk_flags: ['spam', '<unsafe>'],
  created_at: '2026-01-01T00:00:00.000Z',
};

const jobB = {
  id: 'job-beta-5678',
  status: 'published',
  comment_text: 'comment beta',
  route_context: {
    platform: 'qq',
    user_id: 'user-2',
    chat_type: 'private',
  },
  reply_text: null,
  risk_flags: [],
  created_at: null,
};

function resetMocks() {
  for (const mock of Object.values(mockApi)) {
    mock.mockReset();
  }
  mockShowToast.mockReset();
  mockApi.getJobs.mockResolvedValue({ items: [jobA, jobB] });
  mockApi.approveJob.mockResolvedValue({ ok: true });
  mockApi.retryJob.mockResolvedValue({ ok: true });
  mockApi.batchApprove.mockResolvedValue({ ok: true });
  mockApi.batchRetry.mockResolvedValue({ ok: true });
  mockApi.exportJobsCsv.mockResolvedValue(undefined);
  mockApi.getKnowledgeEntries.mockResolvedValue({ items: [] });
  mockApi.createKnowledgeEntry.mockResolvedValue({ ok: true });
  mockApi.disableKnowledgeEntry.mockResolvedValue({ ok: true });
  mockApi.getRoleCards.mockResolvedValue({
    items: [
      {
        key: 'active-card',
        name: 'Active card',
        description: 'active description',
        system_prompt: 'active prompt',
        tone: 'warm',
        constraints: { max_words: 80 },
        enabled: true,
      },
      {
        key: 'disabled-card',
        name: 'Disabled card',
        description: 'disabled description',
        system_prompt: 'disabled prompt',
        tone: 'quiet',
        constraints: 'plain text',
        enabled: false,
      },
    ],
  });
  mockApi.createRoleCard.mockResolvedValue({ ok: true });
  mockApi.updateRoleCard.mockResolvedValue({ ok: true });
  mockApi.disableRoleCard.mockResolvedValue({ ok: true });
  mockApi.activateRoleCard.mockResolvedValue({ ok: true });
}

describe('low coverage admin pages', () => {
  beforeEach(() => {
    resetMocks();
    vi.restoreAllMocks();
  });

  it('filters, refreshes, exports, selects, and batch processes jobs', async () => {
    const container = createPageContainer();

    await renderJobs(container);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.innerHTML).toContain('&lt;comment alpha&gt;');
    expect(container.innerHTML).toContain('&lt;unsafe&gt;');

    container.querySelector('#jobs-status').value = 'failed';
    container.querySelector('#jobs-limit').value = '7';
    container.querySelector('#jobs-filter-btn').click();
    await flushPromises();
    expect(mockApi.getJobs).toHaveBeenLastCalledWith({ status: 'failed', limit: '7' });

    container.querySelector('#jobs-refresh').click();
    await flushPromises();
    expect(mockApi.getJobs).toHaveBeenLastCalledWith({ status: 'failed', limit: '7' });

    container.querySelector('#jobs-export').click();
    await flushPromises();
    expect(mockApi.exportJobsCsv).toHaveBeenCalledWith({ status: 'failed', limit: '7' });
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'success');

    container.querySelector('#jobs-select-all').checked = true;
    container.querySelector('#jobs-select-all').dispatchEvent(new Event('change'));
    expect(container.querySelector('#jobs-batch-bar').style.display).toBe('flex');

    container.querySelector('#jobs-batch-approve').click();
    await flushPromises();
    expect(mockApi.batchApprove).toHaveBeenCalledWith(['job-alpha-1234', 'job-beta-5678']);

    container.querySelectorAll('.job-checkbox')[1].checked = true;
    container.querySelectorAll('.job-checkbox')[1].dispatchEvent(new Event('change'));
    container.querySelector('#jobs-batch-retry').click();
    await flushPromises();
    expect(mockApi.batchRetry).toHaveBeenCalledWith(['job-beta-5678']);

    container.querySelectorAll('.job-checkbox')[1].checked = false;
    container.querySelectorAll('.job-checkbox')[1].dispatchEvent(new Event('change'));
    expect(container.querySelector('#jobs-batch-bar').style.display).toBe('none');
  });

  it('handles job approve, retry, empty, load error, and action errors', async () => {
    const container = createPageContainer();

    mockApi.getJobs
      .mockResolvedValueOnce({ items: [jobA] })
      .mockResolvedValueOnce({ items: [jobA] })
      .mockResolvedValueOnce({ items: [] })
      .mockRejectedValueOnce(new Error('load exploded'));

    await renderJobs(container);

    container.querySelector('.job-approve').click();
    await flushPromises();
    expect(mockApi.approveJob).toHaveBeenCalledWith('job-alpha-1234');
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'success');

    container.querySelector('.job-retry').click();
    await flushPromises();
    expect(mockApi.retryJob).toHaveBeenCalledWith('job-alpha-1234');
    expect(container.querySelector('.table-empty')).toBeTruthy();

    container.querySelector('#jobs-refresh').click();
    await flushPromises();
    expect(container.querySelector('.page-error').textContent).toContain('load exploded');

    mockApi.getJobs.mockResolvedValueOnce({ items: [jobA] });
    container.querySelector('#jobs-refresh').click();
    await flushPromises();
    mockApi.approveJob.mockRejectedValueOnce(new Error('approve exploded'));
    container.querySelector('.job-approve').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('approve exploded'), 'error');
    expect(container.querySelector('.job-approve').disabled).toBe(false);

    mockApi.retryJob.mockRejectedValueOnce(new Error('retry exploded'));
    container.querySelector('.job-retry').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('retry exploded'), 'error');

    mockApi.exportJobsCsv.mockRejectedValueOnce(new Error('export exploded'));
    container.querySelector('#jobs-export').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('export exploded'), 'error');
  });

  it('renders jobs empty state when the response items field is not an array', async () => {
    const container = createPageContainer();
    mockApi.getJobs.mockResolvedValueOnce({ items: 'bad' });

    await renderJobs(container);

    expect(container.querySelector('#jobs-table-wrapper .table-empty')).toBeTruthy();
  });

  it('renders, creates, refreshes, disables, and handles knowledge failures', async () => {
    const container = createPageContainer();
    const enabledEntry = {
      id: 'entry-active-1',
      category: 'personality',
      title: '<title>',
      content: '<content>',
      enabled: true,
      created_at: '2026-01-02T00:00:00.000Z',
    };
    const disabledEntry = {
      id: 'entry-disabled-2',
      category: 'facts',
      title: 'disabled title',
      content: 'disabled content',
      enabled: false,
      created_at: null,
    };

    mockApi.getKnowledgeEntries.mockResolvedValue({ items: [enabledEntry, disabledEntry] });
    await renderKnowledge(container);

    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.innerHTML).toContain('&lt;title&gt;');
    expect(container.querySelectorAll('.knowledge-disable')).toHaveLength(1);

    container.querySelector('#knowledge-category').value = 'rules';
    container.querySelector('#knowledge-title').value = 'New title';
    container.querySelector('#knowledge-content').value = 'New content';
    container.querySelector('#knowledge-create').click();
    await flushPromises();
    expect(mockApi.createKnowledgeEntry).toHaveBeenCalledWith({
      category: 'rules',
      title: 'New title',
      content: 'New content',
    });
    expect(container.querySelector('#knowledge-category').value).toBe('');
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'success');

    container.querySelector('.knowledge-disable').click();
    await flushPromises();
    expect(mockApi.disableKnowledgeEntry).toHaveBeenCalledWith('entry-active-1');

    mockApi.createKnowledgeEntry.mockRejectedValueOnce(new Error('create exploded'));
    container.querySelector('#knowledge-category').value = 'rules';
    container.querySelector('#knowledge-title').value = 'New title';
    container.querySelector('#knowledge-content').value = 'New content';
    container.querySelector('#knowledge-create').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('create exploded'), 'error');

    mockApi.disableKnowledgeEntry.mockRejectedValueOnce(new Error('disable exploded'));
    container.querySelector('.knowledge-disable').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('disable exploded'), 'error');

    mockApi.getKnowledgeEntries.mockRejectedValueOnce(new Error('knowledge load exploded'));
    container.querySelector('#knowledge-refresh').click();
    await flushPromises();
    expect(container.querySelector('.page-error').textContent).toContain('knowledge load exploded');
  });

  it('renders knowledge empty state when the response items field is not an array', async () => {
    const container = createPageContainer();
    mockApi.getKnowledgeEntries.mockResolvedValueOnce({ items: 'bad' });

    await renderKnowledge(container);

    expect(container.querySelector('#knowledge-table-wrapper .table-empty')).toBeTruthy();
  });

  it('creates and edits role cards with constraints, dirty prompts, and status actions', async () => {
    const container = createPageContainer();

    await renderRoleCards(container);

    container.querySelector('#rc-new').click();
    container.querySelector('#rc-save').click();
    await flushPromises();
    expect(mockApi.createRoleCard).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    container.querySelector('#rc-key').value = 'new-card';
    container.querySelector('#rc-name').value = 'New card';
    container.querySelector('#rc-desc').value = 'New description';
    container.querySelector('#rc-system-prompt').value = 'Prompt';
    container.querySelector('#rc-tone').value = 'Direct';
    container.querySelector('#rc-constraints').value = 'not json';
    container.querySelector('#rc-save').click();
    await flushPromises();
    expect(mockApi.createRoleCard).toHaveBeenCalledWith({
      key: 'new-card',
      name: 'New card',
      description: 'New description',
      system_prompt: 'Prompt',
      tone: 'Direct',
      constraints: 'not json',
    });

    container.querySelector('#rc-select').value = 'active-card';
    container.querySelector('#rc-select').dispatchEvent(new Event('change'));
    expect(container.querySelector('#rc-key').disabled).toBe(true);
    expect(container.querySelector('#rc-constraints').value).toContain('max_words');
    expect(container.querySelector('#rc-disable').style.display).toBe('inline-flex');

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    container.querySelector('#rc-name').value = 'Dirty name';
    container.querySelector('#rc-name').dispatchEvent(new Event('input'));
    container.querySelector('#rc-select').value = 'disabled-card';
    container.querySelector('#rc-select').dispatchEvent(new Event('change'));
    expect(container.querySelector('#rc-select').value).toBe('active-card');

    container.querySelector('#rc-select').value = 'disabled-card';
    container.querySelector('#rc-select').dispatchEvent(new Event('change'));
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(container.querySelector('#rc-activate').style.display).toBe('inline-flex');

    container.querySelector('#rc-select').value = 'active-card';
    container.querySelector('#rc-select').dispatchEvent(new Event('change'));
    container.querySelector('#rc-constraints').value = '{"limit":3}';
    container.querySelector('#rc-save').click();
    await flushPromises();
    expect(mockApi.updateRoleCard).toHaveBeenCalledWith('active-card', expect.objectContaining({
      key: 'active-card',
      constraints: { limit: 3 },
    }));

    container.querySelector('#rc-disable').click();
    await flushPromises();
    expect(mockApi.disableRoleCard).toHaveBeenCalledWith('active-card');

    container.querySelector('#rc-select').value = 'disabled-card';
    container.querySelector('#rc-select').dispatchEvent(new Event('change'));
    expect(container.querySelector('#rc-activate').style.display).toBe('inline-flex');
    expect(container.querySelector('#rc-disable').style.display).toBe('none');

    container.querySelector('#rc-activate').click();
    await flushPromises();
    expect(mockApi.activateRoleCard).toHaveBeenCalledWith('disabled-card');
  });

  it('handles role card load, save, disable, activate, and refresh failures', async () => {
    const container = createPageContainer();

    mockApi.getRoleCards.mockRejectedValueOnce(new Error('roles load exploded'));
    await renderRoleCards(container);
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('roles load exploded'), 'error');

    mockApi.getRoleCards.mockResolvedValueOnce([
      {
        key: 'array-card',
        name: '',
        description: '',
        system_prompt: '',
        tone: '',
        constraints: '',
        enabled: true,
      },
    ]);
    container.querySelector('#rc-refresh').click();
    await flushPromises();
    expect([...container.querySelector('#rc-select').options].map((o) => o.value)).toContain('array-card');

    container.querySelector('#rc-select').value = 'array-card';
    container.querySelector('#rc-select').dispatchEvent(new Event('change'));
    mockApi.updateRoleCard.mockRejectedValueOnce(new Error('update exploded'));
    container.querySelector('#rc-save').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('update exploded'), 'error');

    mockApi.disableRoleCard.mockRejectedValueOnce(new Error('disable role exploded'));
    container.querySelector('#rc-disable').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('disable role exploded'), 'error');

    mockApi.getRoleCards.mockResolvedValueOnce({
      items: [{
        key: 'disabled-card',
        name: 'Disabled card',
        description: '',
        system_prompt: '',
        tone: '',
        constraints: '',
        enabled: false,
      }],
    });
    container.querySelector('#rc-refresh').click();
    await flushPromises();
    container.querySelector('#rc-select').value = 'disabled-card';
    container.querySelector('#rc-select').dispatchEvent(new Event('change'));
    mockApi.activateRoleCard.mockRejectedValueOnce(new Error('activate exploded'));
    container.querySelector('#rc-activate').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('activate exploded'), 'error');
  });

  it('covers role-card empty payloads and dirty cancel without an original key', async () => {
    const container = createPageContainer();
    mockApi.getRoleCards.mockResolvedValueOnce({ items: 'bad' });
    const originalConfirm = globalThis.confirm;
    globalThis.confirm = vi.fn(() => false);

    try {
      await renderRoleCards(container);

      expect([...container.querySelector('#rc-select').options]).toHaveLength(1);

      container.querySelector('#rc-name').value = 'Unsaved draft';
      container.querySelector('#rc-name').dispatchEvent(new Event('input'));
      container.querySelector('#rc-select').value = '';
      container.querySelector('#rc-select').dispatchEvent(new Event('change'));

      expect(globalThis.confirm).toHaveBeenCalledTimes(1);
      expect(container.querySelector('#rc-select').value).toBe('');

      globalThis.confirm = vi.fn(() => true);
      const missingOption = document.createElement('option');
      missingOption.value = 'missing-card';
      missingOption.textContent = 'Missing card';
      container.querySelector('#rc-select').appendChild(missingOption);
      container.querySelector('#rc-select').value = 'missing-card';
      container.querySelector('#rc-select').dispatchEvent(new Event('change'));
      expect(container.querySelector('#rc-key').value).toBe('');
    } finally {
      globalThis.confirm = originalConfirm;
    }
  });
});
