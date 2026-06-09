import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderPetCompanion } from '../src/app.js';
import { createBackendPetAdapter } from '../src/api/backend-adapter.js';
import { createPageContainer, flushPromises } from './utils/dom.js';

function createState(overrides = {}) {
  return {
    petName: 'Mochi',
    statusLine: 'Idle on the browser ledge, listening for the next check-in.',
    loopMode: 'Companion seed state',
    lastCheckIn: '2026-04-10 03:30',
    adapterLabel: 'Seed state adapter',
    loopHint: 'Seed state only.',
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
        kind: 'pat',
        title: 'Pat interaction',
        detail: 'A calm pat kept Mochi focused on the browser ledge.',
        timestamp: '2026-04-10T03:28:00.000Z',
        source: 'Seed state adapter',
      },
    ],
    ...overrides,
  };
}

function createStateV2(overrides = {}) {
  const companionOverrides = overrides.companion || {};
  const snapshotOverrides = overrides.snapshot || {};
  return {
    version: 'v2',
    snapshot: {
      profile: {
        petName: 'Mochi',
        species: 'browser-companion',
        archetype: 'gentle-helper',
      },
      relationship: {
        level: 'Growing',
        note: 'The relationship is strengthening through repeated care loops.',
      },
      progress: {
        stage: 'settling',
        progressLabel: 'Settling loop',
        nextMilestone: 'Proactive daily rituals',
      },
      needs: [
        { key: 'energy', label: 'Energy', value: '81%' },
        { key: 'bond', label: 'Bond', value: '58%' },
      ],
      proactiveSignals: [
        { key: 'snack-reminder', label: 'Snack reminder', detail: 'Satiety is dipping. A feed action should restore the loop.' },
      ],
      ...snapshotOverrides,
    },
    companion: createState(companionOverrides),
  };
}

describe('pet companion surface', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-04-10T03:30:00.000Z'));
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders an isolated pet surface with mood, state widgets, and memory summary', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue(createState()),
    };

    await renderPetCompanion(container, { adapter });

    expect(container.querySelector('[data-surface="pet-companion"]')).not.toBeNull();
    expect(container.textContent).toContain('A calm browser companion with a readable ritual loop');
    expect(container.textContent).toContain('Curious');
    expect(container.textContent).toContain('Energy');
    expect(container.textContent).toContain('Memory summary');
    expect(container.textContent).toContain('Companion timeline');
    expect(container.textContent).toContain('Companion rhythm at a glance');
    expect(container.textContent).toContain('Live link');
    expect(container.textContent).toContain('Pat interaction');
    expect(container.querySelector('.interaction-time')?.textContent).toBe('2 mins ago');
    expect(container.querySelector('.interaction-time')?.getAttribute('title')).toBe('2026-04-10 03:28 UTC');
    expect(container.querySelector('.interaction-card-pat')).not.toBeNull();
    expect(container.querySelector('.interaction-kind-pat')?.textContent).toBe('Pat');
    expect(container.querySelector('[data-filter-kind="all"]')?.textContent).toContain('Alt+1');
    expect(container.querySelector('[data-role="action-note-label"]')?.textContent).toBe('Interaction note');
    expect(container.querySelector('[data-role="action-note"]')?.getAttribute('placeholder')).toBe(
      'Optional note for the next pat, feed, or wake.',
    );
    expect(container.querySelector('[data-role="composer-templates"]')?.hasAttribute('hidden')).toBe(true);
    expect(container.querySelector('[data-role="composer-guide"]')?.textContent).toContain(
      'Notes publish through Pat, Feed, or Wake actions.',
    );
    expect(container.querySelector('[data-role="action-note-status-label"]')?.textContent).toBe('Composer idle');
    expect(container.querySelector('[data-role="action-note-clear"]')?.hasAttribute('disabled')).toBe(true);
    expect(container.querySelector('[data-role="shortcut-help"]')?.hasAttribute('hidden')).toBe(true);
    expect(container.querySelector('#nav-list')).toBeNull();
    expect(adapter.getCompanionState).toHaveBeenCalledTimes(1);
  });

  it('renders relationship, progress, and proactive signals from a v2 companion envelope', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue(createStateV2()),
    };

    await renderPetCompanion(container, { adapter });

    expect(container.textContent).toContain('Growing');
    expect(container.textContent).toContain('Settling loop');
    expect(container.textContent).toContain('Proactive signals');
    expect(container.textContent).toContain('Snack reminder');
    expect(container.textContent).toContain('browser-companion');
  });

  it('toggles the shortcut help card from button and keyboard', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue(createState()),
    };

    await renderPetCompanion(container, { adapter });

    const helpToggle = container.querySelector('[data-role="shortcut-help-toggle"]');
    const helpCard = container.querySelector('[data-role="shortcut-help"]');
    const helpTitle = container.querySelector('[data-role="shortcut-help-title"]');
    const helpClose = container.querySelector('[data-role="shortcut-help-close"]');
    const liveRegion = container.querySelector('[data-role="live-region"]');
    const noteInput = container.querySelector('[data-role="action-note"]');

    helpToggle.click();
    expect(helpCard?.hasAttribute('hidden')).toBe(false);
    expect(helpCard?.textContent).toContain('Alt+1');
    expect(helpCard?.textContent).toContain('Ctrl+Enter');
    expect(liveRegion?.textContent).toBe('Shortcut help opened.');
    expect(container.ownerDocument.activeElement).toBe(helpTitle);

    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(container.ownerDocument.activeElement).toBe(helpClose);

    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(container.ownerDocument.activeElement).toBe(helpTitle);

    helpClose.click();
    expect(helpCard?.hasAttribute('hidden')).toBe(true);
    expect(container.ownerDocument.activeElement).toBe(helpToggle);

    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(helpCard?.hasAttribute('hidden')).toBe(true);
    expect(liveRegion?.textContent).toBe('Shortcut help closed.');
    expect(container.ownerDocument.activeElement).toBe(helpToggle);

    noteInput.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(helpCard?.hasAttribute('hidden')).toBe(true);

    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(helpCard?.hasAttribute('hidden')).toBe(false);
    expect(liveRegion?.textContent).toBe('Shortcut help opened.');
    expect(container.ownerDocument.activeElement).toBe(helpTitle);
  });

  it('dismisses shortcut help on outside click without closing it for inside clicks', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue(createState()),
    };

    await renderPetCompanion(container, { adapter });

    const helpToggle = container.querySelector('[data-role="shortcut-help-toggle"]');
    const helpCard = container.querySelector('[data-role="shortcut-help"]');
    const helpTitle = container.querySelector('[data-role="shortcut-help-title"]');
    const liveRegion = container.querySelector('[data-role="live-region"]');
    const noteInput = container.querySelector('[data-role="action-note"]');

    helpToggle.click();
    expect(helpCard?.hasAttribute('hidden')).toBe(false);

    helpTitle.click();
    expect(helpCard?.hasAttribute('hidden')).toBe(false);
    expect(liveRegion?.textContent).toBe('Shortcut help opened.');

    helpToggle.click();
    expect(helpCard?.hasAttribute('hidden')).toBe(true);

    helpToggle.click();
    expect(helpCard?.hasAttribute('hidden')).toBe(false);

    noteInput.focus();
    noteInput.click();
    expect(helpCard?.hasAttribute('hidden')).toBe(true);
    expect(liveRegion?.textContent).toBe('Shortcut help closed.');
    expect(container.ownerDocument.activeElement).toBe(noteInput);
  });

  it('returns focus to the shortcut toggle when outside click closes the help from a non-focusable area', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue(createState()),
    };

    await renderPetCompanion(container, { adapter });

    const helpToggle = container.querySelector('[data-role="shortcut-help-toggle"]');
    const helpCard = container.querySelector('[data-role="shortcut-help"]');
    const helpTitle = container.querySelector('[data-role="shortcut-help-title"]');
    const heroCopy = container.querySelector('.hero-copy');

    helpToggle.click();
    helpTitle.focus();
    heroCopy.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(helpCard?.hasAttribute('hidden')).toBe(true);
    expect(container.ownerDocument.activeElement).toBe(helpToggle);
  });

  it('removes document shortcut listeners when the companion is destroyed', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue(createState()),
    };

    const rendered = await renderPetCompanion(container, { adapter });
    const helpCard = container.querySelector('[data-role="shortcut-help"]');

    rendered.destroy();
    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));

    expect(helpCard?.hasAttribute('hidden')).toBe(true);
  });

  it('cleans up document listeners before rerendering the same target', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue(createState()),
    };
    const addEventListenerSpy = vi.spyOn(container.ownerDocument, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(container.ownerDocument, 'removeEventListener');

    await renderPetCompanion(container, { adapter });
    await renderPetCompanion(container, { adapter });

    expect(addEventListenerSpy.mock.calls.filter(([type]) => type === 'click')).toHaveLength(2);
    expect(addEventListenerSpy.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(2);
    expect(removeEventListenerSpy.mock.calls.filter(([type]) => type === 'click')).toHaveLength(1);
    expect(removeEventListenerSpy.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1);
  });

  it('refreshes the mood widget when the local adapter returns new state', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi
        .fn()
        .mockResolvedValueOnce(createState())
        .mockResolvedValueOnce(
          createState({
            adapterLabel: 'Seed state adapter',
            mood: {
              label: 'Playful',
              note: 'Ready to bounce into a short interaction.',
            },
            recentSignals: ['A fresh status ping just landed.'],
            recentInteractions: [
              {
                kind: 'wake',
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
    expect(container.querySelector('.interaction-kind-wake')?.textContent).toBe('Wake');
    expect(adapter.getCompanionState).toHaveBeenCalledTimes(2);
  });

  it('filters timeline interactions and preserves the selected filter after refresh', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi
        .fn()
        .mockResolvedValueOnce(
          createState({
            recentInteractions: [
              {
                kind: 'pat',
                title: 'Pat interaction',
                detail: 'A calm pat kept Mochi focused on the browser ledge.',
                timestamp: '2026-04-10T03:28:00.000Z',
                source: 'Seed state adapter',
              },
              {
                kind: 'feed',
                title: 'Feed interaction',
                detail: 'A snack tray landed right on time.',
                timestamp: '2026-04-10T03:26:00.000Z',
                source: 'Companion Action',
              },
              {
                kind: 'signal',
                title: 'Queue signal',
                detail: 'A quiet system heartbeat passed through the loop.',
                timestamp: '2026-04-10T03:25:00.000Z',
                source: 'Backend Memory',
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          createState({
            recentInteractions: [
              {
                kind: 'feed',
                title: 'Feed interaction',
                detail: 'Refilled snack tray confirmed after refresh.',
                timestamp: '2026-04-10T03:29:00.000Z',
                source: 'Companion Action',
              },
              {
                kind: 'pat',
                title: 'Pat interaction',
                detail: 'A later pat should stay hidden while feed filter is active.',
                timestamp: '2026-04-10T03:27:00.000Z',
                source: 'Companion Action',
              },
            ],
          }),
        ),
    };

    await renderPetCompanion(container, { adapter });

    const feedFilter = container.querySelector('[data-filter-kind="feed"]');
    feedFilter.click();

    expect(container.querySelector('.timeline-filter.is-active')?.getAttribute('data-filter-kind')).toBe('feed');
    expect(container.querySelector('.action-button.is-linked')?.getAttribute('data-action')).toBe('feed');
    expect(container.querySelector('[data-role="live-region"]')?.textContent).toBe('Timeline filter set to Feed.');
    expect(container.querySelector('[data-filter-kind="feed"]')?.textContent).toContain('Alt+3');
    expect(container.querySelector('[data-role="action-note-label"]')?.textContent).toBe('Feed note');
    expect(container.querySelector('[data-role="action-note"]')?.getAttribute('placeholder')).toBe(
      'Optional note for the next feed.',
    );
    expect(container.querySelector('[data-role="action-note-hint"]')?.textContent).toContain('feed entry');
    expect(container.querySelector('[data-role="action-note-hint"]')?.textContent).toContain('Ctrl+Enter');
    expect(container.querySelector('[data-role="composer-templates"]')?.textContent).toContain('Suggested feed notes');
    expect(container.querySelector('[data-role="composer-guide"]')?.hasAttribute('hidden')).toBe(true);
    expect(container.textContent).toContain('A snack tray landed right on time.');
    expect(container.textContent).not.toContain('A calm pat kept Mochi focused on the browser ledge.');

    const templateButton = container.querySelector('[data-role="composer-template"]');
    templateButton.click();

    expect(container.querySelector('[data-role="action-note"]')?.value).toContain('Refilled snack tray');
    expect(container.querySelector('[data-role="action-note-status-label"]')?.textContent).toBe('Feed draft ready');
    expect(container.querySelector('[data-role="action-note-clear"]')?.hasAttribute('disabled')).toBe(false);

    const noteInput = container.querySelector('[data-role="action-note"]');
    noteInput.value = 'Existing draft';
    templateButton.click();

    expect(container.querySelector('[data-role="action-note"]')?.value).toBe('Existing draft');
    expect(container.querySelector('[data-role="composer-template-actions"]')?.textContent).toContain(
      'Keep the current draft',
    );
    expect(container.querySelector('[data-role="composer-template-actions"]')?.textContent).toContain(
      'Press Esc to cancel this merge.',
    );
    expect(container.querySelector('[data-role="action-note-status-label"]')?.textContent).toBe('Template waiting');
    expect(container.querySelector('[data-role="action-note-clear"]')?.hasAttribute('disabled')).toBe(false);

    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(container.querySelector('[data-role="composer-template-actions"]')?.hasAttribute('hidden')).toBe(true);
    expect(container.querySelector('[data-role="action-note-status-label"]')?.textContent).toBe('Feed draft ready');

    templateButton.click();
    expect(container.querySelector('[data-role="composer-template-actions"]')?.hasAttribute('hidden')).toBe(false);

    container.querySelector('[data-merge-mode="append"]').click();
    expect(container.querySelector('[data-role="action-note"]')?.value).toBe(
      'Existing draft\nRefilled snack tray and appetite stabilized.',
    );
    expect(container.querySelector('[data-role="action-note-status-label"]')?.textContent).toBe('Feed draft ready');

    container.querySelector('[data-role="action-note-clear"]').click();

    expect(container.querySelector('[data-role="action-note"]')?.value).toBe('');
    expect(container.querySelector('[data-role="composer-template-actions"]')?.hasAttribute('hidden')).toBe(true);
    expect(container.querySelector('[data-role="action-note-clear"]')?.hasAttribute('disabled')).toBe(true);

    const secondTemplateButton = container.querySelectorAll('[data-role="composer-template"]')[1];
    noteInput.value = 'Replace this draft';
    secondTemplateButton.click();
    container.querySelector('[data-merge-mode="replace"]').click();

    expect(container.querySelector('[data-role="action-note"]')?.value).toBe(
      'Quick bite restored energy before the next loop window.',
    );

    container.querySelector('[data-action="refresh"]').click();
    await flushPromises();

    expect(adapter.getCompanionState).toHaveBeenCalledTimes(2);
    expect(container.querySelector('.timeline-filter.is-active')?.getAttribute('data-filter-kind')).toBe('feed');
    expect(container.querySelector('.action-button.is-linked')?.getAttribute('data-action')).toBe('feed');
    expect(container.querySelector('[data-role="action-note-label"]')?.textContent).toBe('Feed note');
    expect(container.textContent).toContain('Refilled snack tray confirmed after refresh.');
    expect(container.textContent).not.toContain('A later pat should stay hidden while feed filter is active.');

    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: '5', altKey: true, bubbles: true }));

    expect(container.querySelector('.timeline-filter.is-active')?.getAttribute('data-filter-kind')).toBe('signal');
    expect(container.querySelector('[data-role="live-region"]')?.textContent).toBe('Timeline filter set to Signal.');
    expect(container.querySelector('[data-role="composer-templates"]')?.hasAttribute('hidden')).toBe(true);
    expect(container.querySelector('[data-role="composer-guide"]')?.textContent).toContain(
      'Signal entries are read-only snapshots.',
    );

    const wakeShortcut = container.querySelector('[data-shortcut-kind="wake"]');
    wakeShortcut.click();

    expect(container.querySelector('.timeline-filter.is-active')?.getAttribute('data-filter-kind')).toBe('wake');
    expect(container.querySelector('[data-role="live-region"]')?.textContent).toBe('Timeline filter set to Wake.');
    expect(container.querySelector('.action-button.is-linked')?.getAttribute('data-action')).toBe('wake');
    expect(container.querySelector('[data-role="action-note-label"]')?.textContent).toBe('Wake note');
    expect(container.querySelector('[data-role="composer-templates"]')?.textContent).toContain('Suggested wake notes');
  });

  it('submits the selected action from the composer with Ctrl+Enter', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi
        .fn()
        .mockResolvedValueOnce(
          createState({
            recentInteractions: [
              {
                kind: 'wake',
                title: 'Wake interaction',
                detail: 'Wake prompt queued.',
                timestamp: '2026-04-10T03:28:00.000Z',
                source: 'Companion Action',
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          createState({
            recentInteractions: [
              {
                kind: 'wake',
                title: 'Wake interaction',
                detail: 'Wake prompt sent from keyboard shortcut.',
                timestamp: '2026-04-10T03:29:00.000Z',
                source: 'Companion Action',
              },
            ],
          }),
        ),
      performAction: vi.fn().mockResolvedValue({ ok: true }),
    };

    await renderPetCompanion(container, { adapter });

    container.querySelector('[data-filter-kind="wake"]').click();
    const noteInput = container.querySelector('[data-role="action-note"]');
    noteInput.value = 'keyboard wake';
    noteInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await flushPromises();

    expect(adapter.performAction).toHaveBeenCalledWith('wake', 'keyboard wake');
    expect(adapter.getCompanionState).toHaveBeenCalledTimes(2);
    expect(container.querySelector('.timeline-filter.is-active')?.getAttribute('data-filter-kind')).toBe('wake');
    expect(container.querySelector('[data-role="live-region"]')?.textContent).toBe('Wake action sent.');
    expect(noteInput.value).toBe('');
    expect(container.textContent).toContain('Wake prompt sent from keyboard shortcut.');
  });

  it('announces why Ctrl+Enter is blocked when the composer is not on an action filter', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue(createState()),
      performAction: vi.fn(),
    };

    await renderPetCompanion(container, { adapter });

    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: '5', altKey: true, bubbles: true }));
    const noteInput = container.querySelector('[data-role="action-note"]');
    noteInput.value = 'cannot send from signal';
    noteInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));

    expect(adapter.performAction).not.toHaveBeenCalled();
    expect(container.querySelector('[data-role="live-region"]')?.textContent).toBe(
      'Signal entries are read-only. Pick Pat, Feed, or Wake before sending.',
    );
    expect(noteInput.value).toBe('cannot send from signal');
  });

  it('blocks sending while a template merge decision is pending', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue(createState()),
      performAction: vi.fn(),
    };

    await renderPetCompanion(container, { adapter });

    container.querySelector('[data-filter-kind="feed"]').click();
    const noteInput = container.querySelector('[data-role="action-note"]');
    noteInput.value = 'Existing draft';
    container.querySelector('[data-role="composer-template"]').click();
    noteInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));

    expect(adapter.performAction).not.toHaveBeenCalled();
    expect(container.querySelector('[data-role="composer-template-actions"]')?.hasAttribute('hidden')).toBe(false);
    expect(container.querySelector('[data-role="live-region"]')?.textContent).toBe(
      'Resolve template merge before sending.',
    );
    expect(noteInput.value).toBe('Existing draft');
  });

  it('announces when action sending is unavailable in the current adapter', async () => {
    const container = createPageContainer();

    await renderPetCompanion(container);

    container.querySelector('[data-filter-kind="pat"]').click();
    container.querySelector('[data-role="action-note"]').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true }),
    );

    expect(container.querySelector('[data-role="live-region"]')?.textContent).toBe(
      'Pat action is unavailable in the current adapter.',
    );
    expect(container.querySelector('[data-role="adapter-status"]')?.textContent).toBe('Adapter: action unavailable');
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

    expect(state.degraded).toBe(true);
    expect(state.dataSource).toBe('local-fallback');
    expect(state.petName).toBe('Mochi');
    expect(state.adapterLabel).toContain('Degraded backend snapshot');
    expect(state.backendStatus).toMatchObject({
      degraded: true,
      reason: 'network_down',
      endpoint: '/companion/state-v2',
    });
    expect(state.recentInteractions[0]).toMatchObject({
      kind: 'fallback',
      title: 'Degraded backend snapshot',
      source: 'Backend degraded',
    });
  });

  it('renders visible degraded fallback copy when backend sync fails', async () => {
    const container = createPageContainer();
    const adapter = createBackendPetAdapter({
      fetchImpl: vi.fn().mockRejectedValue(new Error('network_down')),
    });

    await renderPetCompanion(container, { adapter });

    expect(container.textContent).toContain('Degraded mode');
    expect(container.textContent).toContain('Backend companion state unavailable');
    expect(container.textContent).toContain('Degraded backend snapshot');
    expect(container.textContent).toContain('network_down');
    expect(container.textContent).toContain('Degraded backend snapshot');
    expect(container.querySelector('[data-role="adapter-status"]')?.textContent).toBe(
      'Adapter: Degraded backend snapshot',
    );
  });

  it('prefers the v2 backend state endpoint before falling back to the legacy endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => createStateV2(),
    });
    const adapter = createBackendPetAdapter({
      fetchImpl: fetchMock,
    });

    const state = await adapter.getCompanionState();

    expect(fetchMock).toHaveBeenCalledWith(
      '/companion/state-v2',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      }),
    );
    expect(state.version).toBe('v2');
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
                kind: 'pat',
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
    expect(container.querySelector('.timeline-filter.is-active')?.getAttribute('data-filter-kind')).toBe('pat');
    expect(container.querySelector('.action-button.is-linked')?.getAttribute('data-action')).toBe('pat');
    expect(container.querySelector('[data-role="action-note-label"]')?.textContent).toBe('Pat note');
    expect(container.querySelector('[data-role="action-note"]')?.getAttribute('placeholder')).toBe(
      'Optional note for the next pat.',
    );
    expect(container.querySelector('.interaction-kind-pat')?.textContent).toBe('Pat');
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
