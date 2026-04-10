import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer, flushPromises } from '../utils/dom.js';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
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

import { render } from '../../src/pages/memory.js';

describe('memory admin page', () => {
  beforeEach(() => {
    for (const mock of Object.values(mockApi)) {
      mock.mockReset();
    }
    mockShowToast.mockReset();

    mockApi.getMemorySpaces.mockResolvedValue({
      items: [
        {
          id: 7,
          space_key: 'operator:alpha',
          space_type: 'operator',
          title: 'Alpha Operator',
          summary: 'Primary operator memory',
          updated_at: '2026-04-11T00:05:00.000Z',
        },
      ],
    });
    mockApi.getMemoryGrants.mockResolvedValue({
      items: [
        {
          id: 3,
          space_id: 7,
          subject_type: 'operator',
          subject_id: 'alice',
          access_level: 'write',
          updated_at: '2026-04-11T00:05:00.000Z',
        },
      ],
    });
    mockApi.getMemoryIdentityLinks.mockResolvedValue({
      items: [
        {
          id: 9,
          subject_type: 'operator',
          subject_id: 'alice',
          platform: 'bilibili',
          external_id: 'uid-42',
          display_name: 'Alice',
          updated_at: '2026-04-11T00:05:00.000Z',
        },
      ],
    });
    mockApi.createMemorySpace.mockResolvedValue({ ok: true });
    mockApi.grantMemorySpaceAccess.mockResolvedValue({ ok: true });
    mockApi.linkMemoryIdentity.mockResolvedValue({ ok: true });
  });

  it('renders memory spaces, grants, and identity links', async () => {
    const container = createPageContainer();

    await render(container);

    expect(mockApi.getMemorySpaces).toHaveBeenCalledWith({ limit: 50 });
    expect(mockApi.getMemoryGrants).toHaveBeenCalledWith({ limit: 50 });
    expect(mockApi.getMemoryIdentityLinks).toHaveBeenCalledWith({ limit: 50 });
    expect(container.textContent).toContain('Memory 管理');
    expect(container.textContent).toContain('Alpha Operator');
    expect(container.textContent).toContain('alice');
    expect(container.textContent).toContain('uid-42');
  });

  it('creates a memory space', async () => {
    const container = createPageContainer();

    await render(container);
    container.querySelector('#memory-space-key').value = 'operator:beta';
    container.querySelector('#memory-space-title').value = 'Beta Operator';
    container.querySelector('#memory-space-summary').value = 'Secondary operator memory';
    container.querySelector('#memory-space-create').click();
    await flushPromises();

    expect(mockApi.createMemorySpace).toHaveBeenCalledWith({
      space_key: 'operator:beta',
      space_type: 'operator',
      title: 'Beta Operator',
      summary: 'Secondary operator memory',
    });
    expect(mockShowToast).toHaveBeenCalledWith('Space 创建成功', 'success');
  });

  it('blocks invalid grant creation', async () => {
    const container = createPageContainer();

    await render(container);
    container.querySelector('#memory-grant-create').click();
    await flushPromises();

    expect(mockApi.grantMemorySpaceAccess).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith('Space、主体类型和主体 ID 不能为空', 'warning');
  });
});
