import { afterEach, describe, expect, it, vi } from 'vitest';

import { flushPromises } from './utils/dom.js';

const { createBackendPetAdapterMock, renderPetCompanionMock } = vi.hoisted(() => ({
  createBackendPetAdapterMock: vi.fn(() => ({ adapter: 'backend' })),
  renderPetCompanionMock: vi.fn(),
}));

vi.mock('../src/api/backend-adapter.js', () => ({
  createBackendPetAdapter: createBackendPetAdapterMock,
}));

vi.mock('../src/app.js', () => ({
  renderPetCompanion: renderPetCompanionMock,
}));

describe('pet companion bootstrap', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('renders the companion app into the page root', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    renderPetCompanionMock.mockResolvedValueOnce({ destroy: vi.fn() });

    await import('../src/main.js?case=success');
    await flushPromises();

    expect(createBackendPetAdapterMock).toHaveBeenCalledTimes(1);
    expect(renderPetCompanionMock).toHaveBeenCalledWith(document.getElementById('app'), {
      adapter: { adapter: 'backend' },
    });
  });

  it('renders a bootstrap error panel when startup fails', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    renderPetCompanionMock.mockRejectedValueOnce(new Error('startup_down'));

    await import('../src/main.js?case=error');
    await flushPromises();

    expect(document.querySelector('[data-surface="pet-companion"]')?.textContent).toContain('Surface failed to start');
    expect(document.querySelector('[data-surface="pet-companion"]')?.textContent).toContain('startup_down');
  });

  it('renders the generic bootstrap error copy for non-Error startup failures', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    renderPetCompanionMock.mockRejectedValueOnce('startup_down');

    await import('../src/main.js?case=non-error');
    await flushPromises();

    expect(document.querySelector('[data-surface="pet-companion"]')?.textContent).toContain('Unknown startup error');
  });

  it('does nothing when the page root is absent', async () => {
    document.body.innerHTML = '';

    await import('../src/main.js?case=no-root');
    await flushPromises();

    expect(renderPetCompanionMock).not.toHaveBeenCalled();
  });
});
