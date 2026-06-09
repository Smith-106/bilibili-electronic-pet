import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer, flushPromises } from '../utils/dom.js';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getMemorySpaces: vi.fn(),
    createMemorySpace: vi.fn(),
    getMemoryItems: vi.fn(),
    upsertMemoryItem: vi.fn(),
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

import { render } from '../../src/pages/memory.js';

const space = {
  id: 7,
  space_key: 'operator:alpha',
  space_type: 'operator',
  title: 'Alpha Operator',
  summary: '',
  updated_at: null,
};

function resetMocks() {
  for (const mock of Object.values(mockApi)) {
    mock.mockReset();
  }
  mockShowToast.mockReset();
  mockApi.getMemorySpaces.mockResolvedValue({ items: [space] });
  mockApi.getMemoryItems.mockResolvedValue({ items: [] });
  mockApi.getMemoryGrants.mockResolvedValue({ items: [] });
  mockApi.getMemoryIdentityLinks.mockResolvedValue({ items: [] });
  mockApi.createMemorySpace.mockResolvedValue({ ok: true });
  mockApi.upsertMemoryItem.mockResolvedValue({ ok: true });
  mockApi.grantMemorySpaceAccess.mockResolvedValue({ ok: true });
  mockApi.linkMemoryIdentity.mockResolvedValue({ ok: true });
}

describe('memory admin page coverage branches', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('renders empty tables when list payloads are missing arrays', async () => {
    const container = createPageContainer();
    mockApi.getMemorySpaces.mockResolvedValueOnce({});
    mockApi.getMemoryItems.mockResolvedValueOnce({});
    mockApi.getMemoryGrants.mockResolvedValueOnce({});
    mockApi.getMemoryIdentityLinks.mockResolvedValueOnce({});

    await render(container);

    expect(container.querySelector('#memory-spaces-wrapper').textContent).toContain('memory spaces');
    expect(container.querySelector('#memory-items-wrapper').textContent).toContain('memory items');
    expect(container.querySelector('#memory-grants-wrapper').textContent).toContain('grants');
    expect(container.querySelector('#memory-links-wrapper').textContent).toContain('identity links');
    expect(container.querySelector('#memory-item-space').options).toHaveLength(1);
    expect(container.querySelector('#memory-grant-space').options).toHaveLength(1);
  });

  it('shows guarded reload errors during initial load and manual refresh', async () => {
    const container = createPageContainer();
    mockApi.getMemorySpaces.mockRejectedValueOnce(new Error('spaces down'));

    await render(container);

    expect(container.querySelectorAll('.page-error')).toHaveLength(4);
    expect(container.textContent).toContain('spaces down');

    mockApi.getMemorySpaces.mockRejectedValueOnce({});
    container.querySelector('#memory-refresh').click();
    await flushPromises();

    expect(container.querySelectorAll('.page-error')).toHaveLength(4);
  });

  it('validates space creation, clears successful fields, and reports failures', async () => {
    const container = createPageContainer();

    await render(container);
    container.querySelector('#memory-space-create').click();
    await flushPromises();
    expect(mockApi.createMemorySpace).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    container.querySelector('#memory-space-key').value = 'operator:beta';
    container.querySelector('#memory-space-title').value = 'Beta';
    container.querySelector('#memory-space-summary').value = 'summary';
    container.querySelector('#memory-space-create').click();
    await flushPromises();

    expect(mockApi.createMemorySpace).toHaveBeenLastCalledWith({
      space_key: 'operator:beta',
      space_type: 'operator',
      title: 'Beta',
      summary: 'summary',
    });
    expect(container.querySelector('#memory-space-key').value).toBe('');
    expect(container.querySelector('#memory-space-title').value).toBe('');
    expect(container.querySelector('#memory-space-summary').value).toBe('');

    mockApi.createMemorySpace.mockRejectedValueOnce(new Error('space rejected'));
    container.querySelector('#memory-space-key').value = 'operator:error';
    container.querySelector('#memory-space-title').value = 'Error';
    container.querySelector('#memory-space-create').click();
    await flushPromises();

    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('space rejected'), 'error');
  });

  it('validates item upserts, clears successful fields, and reports failures', async () => {
    const container = createPageContainer();

    await render(container);
    container.querySelector('#memory-item-create').click();
    await flushPromises();
    expect(mockApi.upsertMemoryItem).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    container.querySelector('#memory-item-space').value = '7';
    container.querySelector('#memory-item-key').value = 'status:next';
    container.querySelector('#memory-item-content').value = 'next content';
    container.querySelector('#memory-item-create').click();
    await flushPromises();

    expect(mockApi.upsertMemoryItem).toHaveBeenLastCalledWith({
      space_id: 7,
      item_key: 'status:next',
      content: 'next content',
      content_type: 'note',
      source: 'operator',
    });
    expect(container.querySelector('#memory-item-key').value).toBe('');
    expect(container.querySelector('#memory-item-content').value).toBe('');

    mockApi.upsertMemoryItem.mockRejectedValueOnce(new Error('item rejected'));
    container.querySelector('#memory-item-space').value = '7';
    container.querySelector('#memory-item-key').value = 'status:error';
    container.querySelector('#memory-item-content').value = 'bad item';
    container.querySelector('#memory-item-create').click();
    await flushPromises();

    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('item rejected'), 'error');
  });

  it('creates grants and identity links, validates link input, and reports action failures', async () => {
    const container = createPageContainer();

    await render(container);
    container.querySelector('#memory-grant-space').value = '7';
    container.querySelector('#memory-grant-subject-id').value = 'bob';
    container.querySelector('#memory-grant-access').value = 'admin';
    container.querySelector('#memory-grant-create').click();
    await flushPromises();

    expect(mockApi.grantMemorySpaceAccess).toHaveBeenLastCalledWith({
      space_id: 7,
      subject_type: 'operator',
      subject_id: 'bob',
      access_level: 'admin',
    });
    expect(container.querySelector('#memory-grant-subject-id').value).toBe('');

    container.querySelector('#memory-link-create').click();
    await flushPromises();
    expect(mockApi.linkMemoryIdentity).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    container.querySelector('#memory-link-subject-id').value = 'bob';
    container.querySelector('#memory-link-external-id').value = 'uid-bob';
    container.querySelector('#memory-link-display-name').value = 'Bob';
    container.querySelector('#memory-link-create').click();
    await flushPromises();

    expect(mockApi.linkMemoryIdentity).toHaveBeenLastCalledWith({
      subject_type: 'operator',
      subject_id: 'bob',
      platform: 'bilibili',
      external_id: 'uid-bob',
      display_name: 'Bob',
    });
    expect(container.querySelector('#memory-link-external-id').value).toBe('');
    expect(container.querySelector('#memory-link-display-name').value).toBe('');

    mockApi.grantMemorySpaceAccess.mockRejectedValueOnce(new Error('grant rejected'));
    container.querySelector('#memory-grant-space').value = '7';
    container.querySelector('#memory-grant-subject-id').value = 'carol';
    container.querySelector('#memory-grant-create').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('grant rejected'), 'error');

    mockApi.linkMemoryIdentity.mockRejectedValueOnce(new Error('link rejected'));
    container.querySelector('#memory-link-subject-id').value = 'carol';
    container.querySelector('#memory-link-external-id').value = 'uid-carol';
    container.querySelector('#memory-link-create').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('link rejected'), 'error');
  });
});
