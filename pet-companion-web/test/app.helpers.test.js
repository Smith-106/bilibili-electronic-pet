import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __testHooks, renderPetCompanion } from '../src/app.js';
import { createPageContainer, flushPromises } from './utils/dom.js';

const {
  normalizeInteractionKind,
  inferInteractionKind,
  getInteractionKindLabel,
  normalizeInteractionFilter,
  isActionFilter,
  getComposerCopy,
  getComposerGuide,
  getComposerSubmitBlockedMessage,
  getComposerTemplates,
  getComposerStatus,
  formatInteractionTimestamp,
  normalizeBackendStatus,
  normalizeState,
  renderProactiveSignals,
  renderInteractions,
  renderDegradedPanel,
  createStateMarkup,
  createErrorMarkup,
} = __testHooks;

describe('pet companion helper coverage', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-04-10T03:30:00.000Z'));
  });

  afterEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();
    vi.restoreAllMocks();
    delete globalThis.__ADMIN_SESSION_TOKEN__;
    delete globalThis.__ADMIN_API_KEY__;
  });

  it('normalizes interaction kinds and composer copy variants', () => {
    expect(normalizeInteractionKind('PAT')).toBe('pat');
    expect(normalizeInteractionKind('feed')).toBe('feed');
    expect(normalizeInteractionKind(' wake ')).toBe('wake');
    expect(normalizeInteractionKind('signal')).toBe('signal');
    expect(normalizeInteractionKind('fallback')).toBe('fallback');
    expect(normalizeInteractionKind(null)).toBe('signal');

    expect(inferInteractionKind({ source: 'Backend degraded', title: 'Recovered later' })).toBe('fallback');
    expect(inferInteractionKind({ source: 'Companion', title: 'Pat interaction' })).toBe('pat');
    expect(inferInteractionKind({ source: 'Companion', title: 'Feed interaction' })).toBe('feed');
    expect(inferInteractionKind({ source: 'Companion', title: 'Wake interaction' })).toBe('wake');
    expect(inferInteractionKind({ source: '', title: 'Plain signal' })).toBe('signal');
    expect(inferInteractionKind(null)).toBe('signal');
    expect(inferInteractionKind({})).toBe('signal');

    expect(getInteractionKindLabel('all')).toBe('All');
    expect(getInteractionKindLabel('pat')).toBe('Pat');
    expect(getInteractionKindLabel('feed')).toBe('Feed');
    expect(getInteractionKindLabel('wake')).toBe('Wake');
    expect(getInteractionKindLabel('fallback')).toBe('Degraded');
    expect(getInteractionKindLabel('other')).toBe('Signal');

    expect(normalizeInteractionFilter('fallback')).toBe('fallback');
    expect(normalizeInteractionFilter('unknown')).toBe('all');
    expect(normalizeInteractionFilter(null)).toBe('all');
    expect(isActionFilter('pat')).toBe(true);
    expect(isActionFilter('fallback')).toBe(false);

    expect(getComposerCopy('pat')).toMatchObject({ label: 'Pat note' });
    expect(getComposerCopy('feed')).toMatchObject({ label: 'Feed note' });
    expect(getComposerCopy('wake')).toMatchObject({ label: 'Wake note' });
    expect(getComposerCopy('all')).toMatchObject({ label: 'Interaction note' });

    expect(getComposerGuide('pat')).toBeNull();
    expect(getComposerGuide('signal')).toMatchObject({
      message: expect.stringContaining('read-only snapshots'),
    });
    expect(getComposerGuide('fallback')).toMatchObject({
      message: expect.stringContaining('backend recovery only'),
    });
    expect(getComposerGuide('all')).toMatchObject({
      message: expect.stringContaining('Notes publish through Pat, Feed, or Wake actions.'),
    });

    expect(getComposerSubmitBlockedMessage('signal')).toBe(
      'Signal entries are read-only. Pick Pat, Feed, or Wake before sending.',
    );
    expect(getComposerSubmitBlockedMessage('fallback')).toBe(
      'Degraded-state entries are read-only. Pick Pat, Feed, or Wake before sending.',
    );
    expect(getComposerSubmitBlockedMessage('all')).toBe('Pick Pat, Feed, or Wake before sending a note.');

    expect(getComposerTemplates('pat')?.templates).toHaveLength(3);
    expect(getComposerTemplates('feed')?.templates).toHaveLength(3);
    expect(getComposerTemplates('wake')?.templates).toHaveLength(3);
    expect(getComposerTemplates('signal')).toBeNull();

    expect(getComposerStatus('pat', '', null)).toMatchObject({
      label: 'Pat draft empty',
      tone: 'idle',
    });
    expect(getComposerStatus('feed', 'snack', null)).toMatchObject({
      label: 'Feed draft ready',
      tone: 'ready',
    });
    expect(getComposerStatus('signal', 'snack', null)).toMatchObject({
      label: 'Draft waiting',
      tone: 'pending',
    });
    expect(getComposerStatus('all', '', 'template')).toMatchObject({
      label: 'Template waiting',
      tone: 'pending',
    });
    expect(getComposerStatus('all', '', null)).toMatchObject({
      label: 'Composer idle',
      tone: 'idle',
    });
    expect(getComposerStatus(null, null, null)).toMatchObject({
      label: 'Composer idle',
      tone: 'idle',
    });
  });

  it('formats interaction timestamps across pending, invalid, recent, future, and older ranges', () => {
    expect(formatInteractionTimestamp('Pending')).toEqual({
      label: 'Pending',
      exact: '',
      machine: '',
    });
    expect(formatInteractionTimestamp(null)).toEqual({
      label: 'Pending',
      exact: '',
      machine: '',
    });
    expect(formatInteractionTimestamp('')).toEqual({
      label: 'Pending',
      exact: '',
      machine: '',
    });
    expect(formatInteractionTimestamp('not-a-date')).toEqual({
      label: 'not-a-date',
      exact: '',
      machine: '',
    });
    expect(formatInteractionTimestamp('2026-04-10T03:29:50.000Z')).toMatchObject({
      label: 'just now',
      exact: '2026-04-10 03:29 UTC',
      machine: '2026-04-10T03:29:50.000Z',
    });
    expect(formatInteractionTimestamp('2026-04-10T03:30:20.000Z')).toMatchObject({
      label: 'in moments',
    });
    expect(formatInteractionTimestamp('2026-04-10T03:28:00.000Z')).toMatchObject({
      label: '2 mins ago',
    });
    expect(formatInteractionTimestamp('2026-04-10T01:30:00.000Z')).toMatchObject({
      label: '2 hours ago',
    });
    expect(formatInteractionTimestamp('2026-04-08T03:30:00.000Z')).toMatchObject({
      label: '2 days ago',
    });
    expect(formatInteractionTimestamp('2026-03-01T03:30:00.000Z')).toMatchObject({
      label: '2026-03-01 03:30 UTC',
      exact: '2026-03-01 03:30 UTC',
    });
  });

  it('normalizes backend status and state fallbacks across legacy and v2 envelopes', () => {
    expect(normalizeBackendStatus({}, {})).toEqual({
      degraded: false,
      reason: '',
      endpoint: '',
      legacyEndpoint: '',
      retryable: true,
    });

    const legacy = normalizeState(null);
    expect(legacy.petName).toBe('Companion');
    expect(legacy.mood).toEqual({
      label: 'Settling',
      note: 'No mood note has been published yet.',
    });
    expect(legacy.recentSignals).toEqual(['Local companion loop has not reported any recent signals yet.']);
    expect(legacy.recentInteractions).toMatchObject([
      {
        kind: 'signal',
        title: 'Companion signal pending',
        timestamp: 'Pending',
      },
    ]);
    expect(legacy.highlightCards[0]).toMatchObject({
      label: 'Connection',
      value: 'Live link',
    });

    const normalized = normalizeState({
      version: 'v2',
      degraded: true,
      backendStatus: { degraded: true, reason: 'network_down', endpoint: '/v2', legacyEndpoint: '/legacy' },
      snapshot: {
        profile: {},
        relationship: {},
        progress: { stage: 'starter', progressLabel: '', nextMilestone: '' },
      },
      companion: {
        petName: '',
        statusLine: '',
        loopMode: '',
        lastCheckIn: '',
        adapterLabel: '',
        loopHint: '',
        memoryTitle: '',
        memorySummary: '',
        mood: {},
        vitals: [],
        recentSignals: [],
        recentInteractions: [
          {
            title: 'Wake signal',
            detail: '',
            timestamp: '',
            source: '',
          },
          {
            kind: 'fallback',
            title: 'Degraded backend snapshot',
            detail: 'fallback detail',
            timestamp: 'Pending',
            source: 'Backend degraded',
          },
        ],
      },
      proactiveSignals: [
        {
          key: '',
          label: '',
          detail: '',
          dueAt: '',
        },
      ],
    });

    expect(normalized.degraded).toBe(true);
    expect(normalized.dataSource).toBe('local-fallback');
    expect(normalized.dataSourceLabel).toBe('Degraded backend snapshot');
    expect(normalized.profile).toEqual({ species: null, archetype: null });
    expect(normalized.relationship).toEqual({
      level: 'Unknown',
      note: 'Relationship state has not been published yet.',
    });
    expect(normalized.progress).toEqual({
      stage: 'starter',
      progressLabel: 'Legacy loop',
      nextMilestone: null,
    });
    expect(normalized.onboarding.title).toBe('Starter ritual');
    expect(normalized.recentInteractions[0]).toMatchObject({
      kind: 'wake',
      title: 'Wake signal',
      detail: 'No detail published yet.',
      timestamp: 'Pending',
      source: 'Memory',
    });
    expect(normalized.recentInteractions[1].kind).toBe('fallback');
    expect(normalized.proactiveSignals[0]).toEqual({
      key: 'signal',
      label: 'Signal',
      detail: 'No proactive detail published yet.',
      dueAt: null,
    });
    expect(normalized.highlightCards[0]).toMatchObject({
      value: 'Degraded',
      tone: 'warning',
    });
    expect(normalized.highlightCards[3]).toMatchObject({
      value: '2 entries',
      detail: 'Wake is the most visible recent interaction lane.',
    });

    const stateWithRootFallbacks = normalizeState({
      recentInteractions: [
        {
          detail: '',
          timestamp: '',
          source: '',
        },
      ],
      proactiveSignals: [
        {
          key: '',
          label: '',
          detail: '',
          dueAt: '',
        },
      ],
    });
    expect(stateWithRootFallbacks.recentInteractions[0]).toMatchObject({
      kind: 'signal',
      title: 'Companion signal',
      detail: 'No detail published yet.',
      timestamp: 'Pending',
      source: 'Memory',
    });
    expect(stateWithRootFallbacks.proactiveSignals[0]).toEqual({
      key: 'signal',
      label: 'Signal',
      detail: 'No proactive detail published yet.',
      dueAt: null,
    });

    const v2DataSource = normalizeState({
      version: 'v2',
      companion: {
        dataSource: ' backend-companion ',
        recentInteractions: [
          {
            kind: 'fallback',
            title: 'Degraded snapshot',
            detail: 'No action lane is visible.',
            timestamp: 'Pending',
            source: 'Backend degraded',
          },
        ],
      },
      snapshot: {
        proactiveSignals: [
          {
            key: '',
            label: '',
            detail: '',
            dueAt: '',
          },
        ],
      },
    });
    expect(v2DataSource.dataSource).toBe('backend-companion');
    expect(v2DataSource.proactiveSignals[0]).toEqual({
      key: 'signal',
      label: 'Signal',
      detail: 'No proactive detail published yet.',
      dueAt: null,
    });
    expect(v2DataSource.highlightCards[3].detail).toBe('Degraded is the most visible recent interaction lane.');
  });

  it('renders proactive signals, interactions, degraded panel, and state markup branches', () => {
    expect(renderProactiveSignals([])).toContain('No proactive rituals are scheduled yet.');
    expect(
      renderProactiveSignals([
        { label: 'Snack reminder', detail: 'Time to feed.', dueAt: 'soon' },
        { label: 'Wake pulse', detail: 'Prompt a nudge.', dueAt: null },
      ]),
    ).toContain('signal-time');

    expect(renderInteractions([], 'fallback')).toContain('No degraded interactions yet.');

    const interactionsMarkup = renderInteractions(
      [
        {
          kind: 'fallback',
          title: 'Degraded backend snapshot',
          detail: 'Still readable.',
          timestamp: 'Pending',
          source: 'Backend degraded',
        },
        {
          kind: 'signal',
          title: 'Invalid timestamp',
          detail: 'Check exact rendering.',
          timestamp: 'not-a-date',
          source: 'Memory',
        },
      ],
      'all',
    );
    expect(interactionsMarkup).toContain('interaction-card-fallback');
    expect(interactionsMarkup).toContain('Pending');
    expect(interactionsMarkup).toContain('Invalid timestamp');

    expect(
      renderDegradedPanel({
        degraded: false,
      }),
    ).toBe('');

    expect(
      renderDegradedPanel({
        degraded: true,
        dataSourceLabel: 'Degraded backend snapshot',
        retryGuidance: 'Retry later',
        backendStatus: {
          reason: '',
          endpoint: '',
          legacyEndpoint: '',
        },
      }),
    ).toContain('backend_unavailable');

    const panel = renderDegradedPanel({
      degraded: true,
      dataSourceLabel: 'Degraded backend snapshot',
      retryGuidance: 'Retry later',
      backendStatus: {
        reason: 'network_down',
        endpoint: '/companion/state-v2',
        legacyEndpoint: '/companion/state',
      },
    });
    expect(panel).toContain('Attempted endpoints');
    expect(panel).toContain('/companion/state-v2 -&gt; /companion/state');

    const markup = createStateMarkup({
      petName: '<Mochi>',
      mood: { label: 'Curious', note: 'Testing' },
      recentSignals: ['Signal <one>'],
      recentInteractions: [],
      vitals: [{ label: 'Energy', value: '80%' }],
      proactiveSignals: [],
      progress: { progressLabel: 'Legacy loop', nextMilestone: '' },
      relationship: { level: 'Growing', note: 'Bonding' },
    });
    expect(markup).toContain('&lt;Mochi&gt;');
    expect(markup).toContain('No proactive rituals are scheduled yet.');
    expect(markup).toContain('Companion signal pending');

    const fallbackMetricMarkup = createStateMarkup({
      vitals: [{ label: '', value: '' }],
    });
    expect(fallbackMetricMarkup).toContain('State');
    expect(fallbackMetricMarkup).toContain('Unknown');

    expect(createErrorMarkup(new Error('adapter_down'))).toContain('adapter_down');
    expect(createErrorMarkup('adapter_down')).toContain('Unknown adapter error');
  });

  it('guards render entrypoints and event branches while state is pending', async () => {
    await expect(renderPetCompanion(null)).rejects.toThrow(
      'A target element is required to render the pet companion surface.',
    );

    const container = createPageContainer();
    let resolveState;
    const adapter = {
      getCompanionState: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveState = resolve;
          }),
      ),
      performAction: vi.fn(),
    };

    const renderPromise = renderPetCompanion(container, { adapter });
    const noteInput = container.querySelector('[data-role="action-note"]');
    const helpToggle = container.querySelector('[data-role="shortcut-help-toggle"]');
    const helpClose = container.querySelector('[data-role="shortcut-help-close"]');
    const liveRegion = container.querySelector('[data-role="live-region"]');

    helpToggle.click();
    helpToggle.focus();
    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(container.ownerDocument.activeElement).toBe(container.querySelector('[data-role="shortcut-help-title"]'));

    helpToggle.focus();
    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(container.ownerDocument.activeElement).toBe(container.querySelector('[data-role="shortcut-help-close"]'));

    helpClose.focus();
    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(container.ownerDocument.activeElement).toBe(helpToggle);

    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: '2', altKey: true, bubbles: true }));
    expect(container.querySelector('[data-action="pat"]')?.getAttribute('data-filter-linked')).toBe('true');

    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: '9', altKey: true, bubbles: true }));

    resolveState({
      petName: 'Mochi',
      recentSignals: ['Loaded'],
      recentInteractions: [
        {
          kind: 'pat',
          title: 'Pat interaction',
          detail: 'Loaded after pending state.',
          timestamp: '2026-04-10T03:28:00.000Z',
          source: 'Companion Action',
        },
      ],
      vitals: [{ label: 'Energy', value: '76%' }],
    });
    await renderPromise;
    await flushPromises();

    const loadedNoteInput = container.querySelector('[data-role="action-note"]');
    container.querySelector('[data-filter-kind="feed"]').click();
    loadedNoteInput.value = 'Existing draft';
    container.querySelector('[data-role="composer-template"]').click();
    loadedNoteInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(container.querySelector('[data-role="composer-template-actions"]')?.hasAttribute('hidden')).toBe(true);

    loadedNoteInput.value = 'Existing draft';
    container.querySelector('[data-role="composer-template"]').click();
    loadedNoteInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(liveRegion?.textContent).toBe('Template merge cancelled.');
    expect(container.querySelector('[data-role="composer-template-actions"]')?.hasAttribute('hidden')).toBe(true);

    loadedNoteInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(container.querySelector('[data-role="action-note-status-label"]')?.textContent).toBe('Feed draft ready');
  });

  it('keeps rendering stable when the adapter status element is removed', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi
        .fn()
        .mockResolvedValueOnce({
          petName: 'Mochi',
          recentSignals: ['Initial'],
          recentInteractions: [
            {
              kind: 'signal',
              title: 'Signal interaction',
              detail: 'Initial load.',
              timestamp: '2026-04-10T03:28:00.000Z',
              source: 'Memory',
            },
          ],
          vitals: [{ label: 'Energy', value: '76%' }],
        })
        .mockResolvedValueOnce({
          petName: 'Mochi',
          recentSignals: ['Reloaded'],
          recentInteractions: [
            {
              kind: 'signal',
              title: 'Reload interaction',
              detail: 'Reloaded load.',
              timestamp: '2026-04-10T03:29:00.000Z',
              source: 'Memory',
            },
          ],
          vitals: [{ label: 'Energy', value: '80%' }],
        }),
    };

    const rendered = await renderPetCompanion(container, { adapter });
    container.querySelector('[data-role="adapter-status"]')?.remove();

    await rendered.reload();
    await flushPromises();

    expect(container.textContent).toContain('Reload interaction');
  });

  it('keeps stale template merge controls harmless after pending state is cleared', async () => {
    const container = createPageContainer();
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue({
        petName: 'Mochi',
        recentInteractions: [
          {
            kind: 'feed',
            title: 'Feed interaction',
            detail: 'Template boundary state.',
            timestamp: '2026-04-10T03:28:00.000Z',
            source: 'Memory',
          },
        ],
      }),
      performAction: vi.fn(),
    };

    await renderPetCompanion(container, { adapter });
    container.querySelector('[data-filter-kind="feed"]').click();
    const noteInput = container.querySelector('[data-role="action-note"]');
    const templateButton = container.querySelector('[data-role="composer-template"]');

    templateButton.removeAttribute('data-template-value');
    templateButton.click();
    expect(noteInput.value).toBe('');

    noteInput.value = 'Existing draft';
    container.querySelector('[data-role="composer-template"]').click();

    const appendButton = container.querySelector('[data-merge-mode="append"]');
    const cancelButton = container.querySelector('[data-merge-mode="cancel"]');
    noteInput.dispatchEvent(new Event('input', { bubbles: true }));
    appendButton.click();

    expect(noteInput.value).toBe('Existing draft');

    noteInput.value = 'Another draft';
    container.querySelector('[data-role="composer-template"]').click();
    cancelButton.click();

    expect(container.querySelector('[data-role="live-region"]')?.textContent).toBe('Template merge cancelled.');
  });

  it('keeps sparse shell nodes defensive when optional controls are missing', async () => {
    const container = createPageContainer();
    const originalQuerySelector = container.querySelector.bind(container);
    const missingSelectors = new Set([
      '[data-role="adapter-status"]',
      '[data-role="shortcut-help-toggle"]',
      '[data-role="shortcut-help"]',
      '[data-role="shortcut-help-title"]',
      '[data-role="shortcut-help-close"]',
      '[data-role="live-region"]',
      '[data-role="action-note"]',
      '[data-role="action-note-label"]',
      '[data-role="action-note-hint"]',
      '[data-role="action-note-status"]',
      '[data-role="action-note-status-label"]',
      '[data-role="action-note-status-detail"]',
      '[data-role="action-note-clear"]',
      '[data-role="composer-templates"]',
      '[data-role="composer-template-actions"]',
      '[data-role="composer-guide"]',
    ]);
    container.querySelector = vi.fn((selector) => {
      if (missingSelectors.has(selector)) {
        return null;
      }
      return originalQuerySelector(selector);
    });

    const adapter = {
      getCompanionState: vi
        .fn()
        .mockResolvedValueOnce({
          petName: 'Sparse Mochi',
          recentInteractions: [
            {
              kind: 'pat',
              title: 'Sparse pat',
              detail: 'Rendered without optional controls.',
              timestamp: '2026-04-10T03:28:00.000Z',
              source: 'Memory',
            },
          ],
        })
        .mockResolvedValueOnce({
          petName: 'Sparse Mochi',
          recentInteractions: [
            {
              kind: 'feed',
              title: 'Sparse feed',
              detail: 'Action reload worked without optional note controls.',
              timestamp: '2026-04-10T03:29:00.000Z',
              source: 'Memory',
            },
          ],
        }),
      performAction: vi.fn().mockResolvedValue({ ok: true }),
    };

    await renderPetCompanion(container, { adapter });
    container.ownerDocument.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    container.querySelector('[data-action="feed"]').click();
    await flushPromises();

    expect(adapter.performAction).toHaveBeenCalledWith('feed', undefined);
    expect(container.textContent).toContain('Sparse feed');
  });

  it('keeps sparse shortcut and note controls defensive across keyboard paths', async () => {
    const container = createPageContainer();
    const originalQuerySelector = container.querySelector.bind(container);
    const missingSelectors = new Set([
      '[data-role="shortcut-help-title"]',
      '[data-role="shortcut-help-close"]',
    ]);
    container.querySelector = vi.fn((selector) => {
      if (missingSelectors.has(selector)) {
        return null;
      }
      return originalQuerySelector(selector);
    });
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue({
        petName: 'Sparse controls',
        recentInteractions: [
          {
            kind: 'feed',
            title: 'Feed interaction',
            detail: 'Optional controls are absent.',
            timestamp: '2026-04-10T03:28:00.000Z',
            source: 'Memory',
          },
        ],
      }),
      performAction: vi.fn(),
    };

    await renderPetCompanion(container, { adapter });
    const helpToggle = container.querySelector('[data-role="shortcut-help-toggle"]');
    helpToggle.click();
    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    container.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    container.ownerDocument.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    container.querySelector('[data-role="action-note-clear"]').click();
    container.querySelector('[data-filter-kind="feed"]').click();
    container.querySelector('[data-role="composer-template"]').click();
    container.querySelector('[data-action="feed"]').setAttribute('data-action', '');
    container.querySelector('[data-action=""]').click();

    expect(adapter.performAction).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Optional controls are absent.');
  });

  it('ignores composer template clicks when the note input is unavailable', async () => {
    const container = createPageContainer();
    const originalQuerySelector = container.querySelector.bind(container);
    container.querySelector = vi.fn((selector) => {
      if (selector === '[data-role="action-note"]') {
        return null;
      }
      return originalQuerySelector(selector);
    });
    const adapter = {
      getCompanionState: vi.fn().mockResolvedValue({
        petName: 'No note input',
        recentInteractions: [
          {
            kind: 'feed',
            title: 'Feed interaction',
            detail: 'Template button should be harmless without a note input.',
            timestamp: '2026-04-10T03:28:00.000Z',
            source: 'Memory',
          },
        ],
      }),
      performAction: vi.fn(),
    };

    await renderPetCompanion(container, { adapter });
    container.querySelector('[data-filter-kind="feed"]').click();
    container.querySelector('[data-role="composer-template"]').click();

    expect(container.querySelector('[data-role="composer-template-actions"]')?.hasAttribute('hidden')).toBe(true);
    expect(adapter.performAction).not.toHaveBeenCalled();
  });
});
