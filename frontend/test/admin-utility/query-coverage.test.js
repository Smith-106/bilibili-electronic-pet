import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer, flushPromises } from '../utils/dom.js';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getComments: vi.fn(),
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

import { render } from '../../src/pages/query.js';

const COMMENT_HISTORY_KEY = 'query_recent_comment_ids';
const JOB_HISTORY_KEY = 'query_recent_job_ids';

function setClipboard(clipboard) {
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
  });
}

function resetMocks() {
  sessionStorage.clear();
  for (const mock of Object.values(mockApi)) {
    mock.mockReset();
  }
  mockShowToast.mockReset();
  mockApi.getComments.mockResolvedValue({
    total: 2,
    items: [
      {
        canonical_comment_id: 'c-canonical',
        comment_id: 'c-legacy',
        platform: 'qq',
        source: 'onebot',
        content: 'listed comment',
        route_context: { platform: 'qq', user_id: 'user-1', chat_type: 'private' },
        created_at: '2026-04-07T00:00:00.000Z',
      },
      {
        id: '',
        platform: '',
        source: '',
        content: '',
        route_context: null,
        created_at: null,
      },
    ],
  });
  mockApi.getComment.mockResolvedValue({ id: 'c-1', content: 'hello', nested: { ok: true } });
  mockApi.getJob.mockResolvedValue({ id: 'j-1', status: 'queued' });
  setClipboard(undefined);
}

describe('query page coverage branches', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('ignores invalid history payloads and runs comment query from Enter', async () => {
    const container = createPageContainer();
    sessionStorage.setItem(COMMENT_HISTORY_KEY, '{bad json');
    sessionStorage.setItem(JOB_HISTORY_KEY, JSON.stringify({ nope: true }));

    await render(container);

    expect(container.querySelector('#query-comment-recent').textContent).toBe('');
    expect(container.querySelector('#query-job-recent').textContent).toBe('');

    container.querySelector('#query-comment-id').value = ' c-enter ';
    container.querySelector('#query-comment-id').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await flushPromises();

    expect(mockApi.getComment).toHaveBeenCalledWith('c-enter');
    expect(container.querySelector('#query-comment-copy').disabled).toBe(false);
    expect(JSON.parse(sessionStorage.getItem(COMMENT_HISTORY_KEY))).toEqual(['c-enter']);
    expect(container.querySelector('#query-comment-recent [data-query-id]').dataset.queryId).toBe('c-enter');
  });

  it('copies comment payloads with clipboard and warns when no payload is available', async () => {
    const container = createPageContainer();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    await render(container);
    container.querySelector('#query-comment-id').value = 'c-copy';
    container.querySelector('#query-comment-btn').click();
    await flushPromises();

    container.querySelector('#query-comment-copy').click();
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith(JSON.stringify({ id: 'c-1', content: 'hello', nested: { ok: true } }, null, 2));
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'success');

    container.querySelector('#query-comment-clear').click();
    const copyButton = container.querySelector('#query-comment-copy');
    copyButton.disabled = false;
    copyButton.click();
    await flushPromises();

    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');
  });

  it('renders empty detail payloads and comment lookup errors', async () => {
    const container = createPageContainer();
    mockApi.getComment.mockResolvedValueOnce({});

    await render(container);
    container.querySelector('#query-comment-id').value = 'c-empty';
    container.querySelector('#query-comment-btn').click();
    await flushPromises();

    expect(container.querySelector('#query-comment-result .table-empty')).toBeTruthy();

    mockApi.getComment.mockRejectedValueOnce(new Error('comment down'));
    container.querySelector('#query-comment-id').value = 'c-fail';
    container.querySelector('#query-comment-btn').click();
    await flushPromises();

    expect(container.querySelector('#query-comment-result .page-error').textContent).toContain('comment down');
    expect(container.querySelector('#query-comment-meta').textContent).toBe('');
  });

  it('runs job query from recent history, handles failures, and falls back when clipboard is missing', async () => {
    const container = createPageContainer();
    sessionStorage.setItem(JOB_HISTORY_KEY, JSON.stringify(['job-recent']));

    await render(container);
    container.querySelector('#query-job-recent [data-query-id]').click();
    await flushPromises();

    expect(mockApi.getJob).toHaveBeenCalledWith('job-recent');
    expect(container.querySelector('#query-goto-comment')).toBeNull();

    container.querySelector('#query-job-copy').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    mockApi.getJob.mockRejectedValueOnce(new Error('job down'));
    container.querySelector('#query-job-id').value = 'job-fail';
    container.querySelector('#query-job-id').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await flushPromises();

    expect(container.querySelector('#query-job-result .page-error').textContent).toContain('job down');
    expect(container.querySelector('#query-job-meta').textContent).toBe('');

    container.querySelector('#query-job-clear').click();
    const copyButton = container.querySelector('#query-job-copy');
    copyButton.disabled = false;
    copyButton.click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');
  });

  it('handles undefined payload fallbacks, linked job comments, and job clipboard success', async () => {
    const container = createPageContainer();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    mockApi.getComment.mockResolvedValueOnce(undefined);
    mockApi.getJob.mockResolvedValueOnce({ id: 'job-linked', comment_id: 'comment-linked' });

    await render(container);

    container.querySelector('#query-comment-id').value = 'comment-empty-payload';
    container.querySelector('#query-comment-btn').click();
    await flushPromises();

    expect(container.querySelector('#query-comment-result .table-empty')).toBeTruthy();
    expect(container.querySelector('#query-comment-copy').disabled).toBe(false);

    container.querySelector('#query-job-id').value = 'job-linked';
    container.querySelector('#query-job-btn').click();
    await flushPromises();

    expect(container.querySelector('#query-goto-comment')).toBeTruthy();
    container.querySelector('#query-job-copy').click();
    await flushPromises();
    expect(writeText).toHaveBeenLastCalledWith(JSON.stringify({ id: 'job-linked', comment_id: 'comment-linked' }, null, 2));
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'success');

    container.querySelector('#query-goto-comment').click();
    await flushPromises();
    expect(mockApi.getComment).toHaveBeenLastCalledWith('comment-linked');
  });

  it('covers recent button dataset fallbacks, null detail values, and copy fallback with payloads', async () => {
    const container = createPageContainer();
    sessionStorage.setItem(COMMENT_HISTORY_KEY, JSON.stringify(['recent-comment']));
    mockApi.getComment.mockResolvedValueOnce({ id: 'recent-comment', optional: null });

    await render(container);

    const recentButton = container.querySelector('#query-comment-recent [data-query-id]');
    recentButton.removeAttribute('data-query-id');
    container.querySelector('#query-comment-id').value = 'fallback-comment';
    recentButton.click();
    await flushPromises();

    expect(mockApi.getComment).toHaveBeenCalledWith('fallback-comment');
    expect(container.querySelector('#query-comment-result').textContent).toContain('-');

    container.querySelector('#query-comment-copy').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    mockApi.getJob.mockResolvedValueOnce(undefined);
    container.querySelector('#query-job-id').value = 'job-empty-payload';
    container.querySelector('#query-job-btn').click();
    await flushPromises();
    expect(container.querySelector('#query-job-result .table-empty')).toBeTruthy();
  });

  it('renders missing-id rows, opens comment details from list buttons, and handles list empty and error states', async () => {
    const container = createPageContainer();

    await render(container);

    expect(container.textContent).toContain('listed comment');
    expect(container.textContent).toContain('缺少 ID');
    container.querySelector('.query-comment-open').click();
    await flushPromises();
    expect(mockApi.getComment).toHaveBeenCalledWith('c-canonical');

    const listButton = container.querySelector('.query-comment-open');
    listButton.removeAttribute('data-comment-id');
    listButton.click();
    await flushPromises();
    expect(mockApi.getComment).toHaveBeenLastCalledWith('c-canonical');

    mockApi.getComments.mockResolvedValueOnce({ total: 0, items: [] });
    container.querySelector('#query-comments-limit').value = '5';
    container.querySelector('#query-comments-offset').value = '2';
    container.querySelector('#query-comments-load').click();
    await flushPromises();

    expect(mockApi.getComments).toHaveBeenLastCalledWith({ limit: '5', offset: '2' });
    expect(container.querySelector('#query-comments-wrapper .table-empty')).toBeTruthy();

    mockApi.getComments.mockRejectedValueOnce(new Error('comments down'));
    container.querySelector('#query-comments-load').click();
    await flushPromises();

    expect(container.querySelector('#query-comments-wrapper .page-error').textContent).toContain('comments down');
  });

  it('uses list length as total fallback when comments payload is not an array', async () => {
    const container = createPageContainer();
    mockApi.getComments.mockResolvedValueOnce({ total: 'not-a-number', items: 'bad' });

    await render(container);

    expect(container.querySelector('#query-comments-meta').textContent).toContain('0 / 0');
    expect(container.querySelector('#query-comments-wrapper .table-empty')).toBeTruthy();
  });

  it('uses array comment payload totals and warns for empty direct queries', async () => {
    const container = createPageContainer();
    mockApi.getComments.mockResolvedValueOnce([
      {
        comment_id: 'array-comment',
        content: 'array payload',
        created_at: '2026-04-07T00:00:00.000Z',
      },
    ]);

    await render(container);

    expect(container.querySelector('#query-comments-meta').textContent).toContain('0 / 0');

    container.querySelector('#query-comment-id').value = '   ';
    container.querySelector('#query-comment-btn').click();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    container.querySelector('#query-job-id').value = '   ';
    container.querySelector('#query-job-btn').click();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');
  });

  it('covers empty history inserts, non-enter keys, and empty detail fallbacks', async () => {
    const container = createPageContainer();
    sessionStorage.setItem(COMMENT_HISTORY_KEY, JSON.stringify(['']));
    sessionStorage.setItem(JOB_HISTORY_KEY, JSON.stringify(['']));
    mockApi.getComment.mockResolvedValueOnce(null);
    mockApi.getJob.mockResolvedValueOnce({ id: 'job-with-null', optional: undefined });

    await render(container);

    container.querySelector('#query-comment-id').value = '';
    container.querySelector('#query-comment-id').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    container.querySelector('#query-job-id').value = '';
    container.querySelector('#query-job-id').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(mockApi.getComment).not.toHaveBeenCalled();
    expect(mockApi.getJob).not.toHaveBeenCalled();

    container.querySelector('#query-comment-id').value = '';
    container.querySelector('#query-comment-btn').click();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    container.querySelector('#query-comment-id').value = '   ';
    container.querySelector('#query-comment-id').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(mockApi.getComment).not.toHaveBeenCalled();

    container.querySelector('#query-comment-id').value = 'null-comment';
    container.querySelector('#query-comment-btn').click();
    await flushPromises();
    expect(container.querySelector('#query-comment-result .table-empty')).toBeTruthy();

    container.querySelector('#query-job-id').value = 'job-with-null';
    container.querySelector('#query-job-btn').click();
    await flushPromises();
    expect(container.querySelector('#query-job-result').textContent).toContain('-');
  });

  it('deduplicates and truncates history entries while ignoring falsy values', async () => {
    const container = createPageContainer();
    sessionStorage.setItem(COMMENT_HISTORY_KEY, JSON.stringify(['c-5', 'c-4', 'c-3', 'c-2', 'c-1']));

    await render(container);

    container.querySelector('#query-comment-id').value = ' c-3 ';
    container.querySelector('#query-comment-btn').click();
    await flushPromises();

    expect(mockApi.getComment).toHaveBeenCalledWith('c-3');
    expect(JSON.parse(sessionStorage.getItem(COMMENT_HISTORY_KEY))).toEqual(['c-3', 'c-5', 'c-4', 'c-2', 'c-1']);
  });
});
