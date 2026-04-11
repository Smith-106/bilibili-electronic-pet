import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderPetCompanion } from '../src/app.js';
import { createBackendPetAdapter } from '../src/api/backend-adapter.js';
import { createPageContainer, flushPromises } from './utils/dom.js';

function createState(overrides = {}) {
  return {
    petName: 'Mochi',
    statusLine: 'Idle on the browser ledge, listening for the next check-in.',
    loopMode: 'Local placeholder loop',
    lastCheckIn: '2026-04-10 03:30',
    adapterLabel: 'Loop stub',
    loopHint: 'Local adapter only.',
    mood: {
      label: 'Curious',
      note: 'Waiting for the next nudge.',
    },
    memoryTitle: 'Memory summary',
    memorySummary: 'Tracks the last milestone so the pet can keep a light sense of continuity.',
    vitals: [
      { label: 'Energy', value: '76%' },
      { label: 'Hunger', value: 'Snack soon' },
      { label: 'Bond', value: 'Growing' },
    ],
    recentSignals: ['Last pat 2 minutes ago.'],
    recentInteractions: [
      {
        title: 'Pat interaction',
        detail: 'A calm pat kept Mochi focused on the browser ledge.',
        timestamp: '2026-04-10T03:28:00.000Z',
        source: 'Local Stub',
      },
    ],
    ...overrides,
  };
}

describe('pet companion surface', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-04-10T03:30:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an isolated pet surface with mood, state widgets, and memory summary', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue(createState()),
    };

    await renderPetCompanion(container, { adapter });

    expect(container.querySelector('[data-surface="pet-companion"]')).not.toBeNull();
    expect(container.textContent).toContain('Browser buddy without the admin shell');
    expect(container.textContent).toContain('Curious');
    expect(container.textContent).toContain('Energy');
    expect(container.textContent).toContain('Memory summary');
    expect(container.textContent).toContain('Companion timeline');
    expect(container.textContent).toContain('Pat interaction');
    expect(container.querySelector('.interaction-time')?.textContent).toBe('2 mins ago');
    expect(container.querySelector('.interaction-time')?.getAttribute('title')).toBe('2026-04-10 03:28 UTC');
    expect(container.querySelector('#nav-list')).toBeNull();
    expect(adapter.getCompanionState).toHaveBeenCalledTimes(1);
  });

  it('refreshes the mood widget when the local adapter returns new state', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi
        .fn()
        .mockResolvedValueOnce(createState())
        .mockResolvedValueOnce(
          createState({
            adapterLabel: 'Loop stub',
            mood: {
              label: 'Playful',
              note: 'Ready to bounce into a short interaction.',
            },
            recentSignals: ['A fresh status ping just landed.'],
            recentInteractions: [
              {
                title: 'Wake interaction',
                detail: 'A quick wake prompt reopened the next interaction window.',
                timestamp: '2026-04-10T03:31:00.000Z',
                source: 'Backend Memory',
              },
            ],
          }),
        ),
    };

    await renderPetCompanion(container, { adapter });

    container.querySelector('[data-action="refresh"]').click();
    await flushPromises();

    expect(container.textContent).toContain('Playful');
    expect(container.textContent).toContain('A fresh status ping just landed.');
    expect(container.textContent).toContain('Wake interaction');
    expect(container.querySelector('.interaction-time')?.textContent).toBe('in 1 min');
    expect(adapter.getCompanionState).toHaveBeenCalledTimes(2);
  });

  it('shows a degraded panel when the local adapter fails', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockRejectedValue(new Error('local loop offline')),
    };

    await renderPetCompanion(container, { adapter });

    expect(container.textContent).toContain('Companion unavailable');
    expect(container.textContent).toContain('local loop offline');
    expect(container.textContent).toContain('surface stays bootable');
  });

  it('falls back to local companion state when backend fetch fails', async () => {
    const adapter = createBackendPetAdapter({
      fetchImpl: vi.fn().mockRejectedValue(new Error('network_down')),
    });

    const state = await adapter.getCompanionState();

    expect(state.petName).toBe('Mochi');
    expect(state.adapterLabel).toContain('Local');
  });

  it('posts companion actions through the backend adapter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, action: 'pat', item_key: 'action:pat-latest' }),
    });
    const adapter = createBackendPetAdapter({
      fetchImpl: fetchMock,
    });

    const result = await adapter.performAction('pat', 'soft tap');

    expect(fetchMock).toHaveBeenCalledWith(
      '/companion/actions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'pat', note: 'soft tap' }),
      }),
    );
    expect(result).toEqual({ ok: true, action: 'pat', item_key: 'action:pat-latest' });
  });

  it('triggers action buttons and reloads companion state', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi
        .fn()
        .mockResolvedValueOnce(createState())
        .mockResolvedValueOnce(
          createState({
            mood: {
              label: 'Calm',
              note: 'A gentle pat settled the companion.',
            },
            recentSignals: ['Pat action recorded.'],
            recentInteractions: [
              {
                title: 'Pat interaction',
                detail: 'A gentle pat settled Mochi and raised the bond signal.',
                timestamp: '2026-04-10T03:32:00.000Z',
                source: 'Companion Action',
              },
            ],
          }),
        ),
      performAction: vi.fn().mockResolvedValue({ ok: true }),
    };

    await renderPetCompanion(container, { adapter });

    const noteInput = container.querySelector('[data-role="action-note"]');
    noteInput.value = 'steady pulse';
    container.querySelector('[data-action="pat"]').click();
    await flushPromises();

    expect(adapter.performAction).toHaveBeenCalledWith('pat', 'steady pulse');
    expect(adapter.getCompanionState).toHaveBeenCalledTimes(2);
    expect(noteInput.value).toBe('');
    expect(container.textContent).toContain('Calm');
    expect(container.textContent).toContain('Pat action recorded.');
    expect(container.textContent).toContain('Companion Action');
  });

  it('keeps the note draft when an action request fails', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue(createState()),
      performAction: vi.fn().mockRejectedValue(new Error('action_failed')),
    };

    await renderPetCompanion(container, { adapter });

    const noteInput = container.querySelector('[data-role="action-note"]');
    noteInput.value = 'keep this note';
    container.querySelector('[data-action="feed"]').click();
    await flushPromises();

    expect(adapter.performAction).toHaveBeenCalledWith('feed', 'keep this note');
    expect(adapter.getCompanionState).toHaveBeenCalledTimes(1);
    expect(noteInput.value).toBe('keep this note');
    expect(container.textContent).toContain('action_failed');
  });
});
