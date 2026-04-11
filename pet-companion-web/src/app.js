import { createLocalPetAdapter } from './api/local-adapter.js';

const FALLBACK_VITALS = [
  { label: 'Energy', value: 'Unknown' },
  { label: 'Hunger', value: 'Unknown' },
  { label: 'Bond', value: 'Unknown' },
];

const FALLBACK_SIGNALS = ['Local companion loop has not reported any recent signals yet.'];
const FALLBACK_INTERACTIONS = [
  {
    kind: 'signal',
    title: 'Companion signal pending',
    detail: 'No structured interaction timeline is available yet.',
    timestamp: 'Pending',
    source: 'Local stub',
  },
];
const INTERACTION_FILTER_ORDER = ['all', 'pat', 'feed', 'wake', 'signal', 'fallback'];

function normalizeInteractionKind(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'pat' || normalized === 'feed' || normalized === 'wake' || normalized === 'signal') {
    return normalized;
  }
  if (normalized === 'fallback') {
    return 'fallback';
  }
  return 'signal';
}

function inferInteractionKind(entry) {
  const source = String(entry?.source ?? '').trim().toLowerCase();
  const title = String(entry?.title ?? '').trim().toLowerCase();

  if (source.includes('fallback') || title.includes('fallback')) {
    return 'fallback';
  }
  if (title.includes('pat')) {
    return 'pat';
  }
  if (title.includes('feed')) {
    return 'feed';
  }
  if (title.includes('wake')) {
    return 'wake';
  }
  return 'signal';
}

function getInteractionKindLabel(kind) {
  if (kind === 'all') {
    return 'All';
  }
  if (kind === 'pat') {
    return 'Pat';
  }
  if (kind === 'feed') {
    return 'Feed';
  }
  if (kind === 'wake') {
    return 'Wake';
  }
  if (kind === 'fallback') {
    return 'Fallback';
  }
  return 'Signal';
}

function normalizeInteractionFilter(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return INTERACTION_FILTER_ORDER.includes(normalized) ? normalized : 'all';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatPreciseTimestamp(date) {
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function formatRelativeTime(deltaSeconds, unitSeconds, singularLabel, pluralLabel) {
  const count = Math.max(1, Math.round(Math.abs(deltaSeconds) / unitSeconds));
  const unitLabel = count === 1 ? singularLabel : pluralLabel;
  return deltaSeconds >= 0 ? `${count} ${unitLabel} ago` : `in ${count} ${unitLabel}`;
}

function formatInteractionTimestamp(timestamp) {
  const rawTimestamp = String(timestamp ?? '').trim();
  if (!rawTimestamp || rawTimestamp.toLowerCase() === 'pending') {
    return {
      label: rawTimestamp || 'Pending',
      exact: '',
      machine: '',
    };
  }

  const date = new Date(rawTimestamp);
  if (Number.isNaN(date.getTime())) {
    return {
      label: rawTimestamp,
      exact: '',
      machine: '',
    };
  }

  const deltaSeconds = Math.round((Date.now() - date.getTime()) / 1000);
  const absoluteSeconds = Math.abs(deltaSeconds);

  if (absoluteSeconds < 45) {
    return {
      label: deltaSeconds >= 0 ? 'just now' : 'in moments',
      exact: formatPreciseTimestamp(date),
      machine: date.toISOString(),
    };
  }

  if (absoluteSeconds < 60 * 60) {
    return {
      label: formatRelativeTime(deltaSeconds, 60, 'min', 'mins'),
      exact: formatPreciseTimestamp(date),
      machine: date.toISOString(),
    };
  }

  if (absoluteSeconds < 60 * 60 * 24) {
    return {
      label: formatRelativeTime(deltaSeconds, 60 * 60, 'hour', 'hours'),
      exact: formatPreciseTimestamp(date),
      machine: date.toISOString(),
    };
  }

  if (absoluteSeconds < 60 * 60 * 24 * 7) {
    return {
      label: formatRelativeTime(deltaSeconds, 60 * 60 * 24, 'day', 'days'),
      exact: formatPreciseTimestamp(date),
      machine: date.toISOString(),
    };
  }

  return {
    label: formatPreciseTimestamp(date),
    exact: formatPreciseTimestamp(date),
    machine: date.toISOString(),
  };
}

function normalizeState(state) {
  const safeState = state && typeof state === 'object' ? state : {};
  const mood = safeState.mood && typeof safeState.mood === 'object' ? safeState.mood : {};
  const vitals = Array.isArray(safeState.vitals) && safeState.vitals.length ? safeState.vitals : FALLBACK_VITALS;
  const recentSignals =
    Array.isArray(safeState.recentSignals) && safeState.recentSignals.length
      ? safeState.recentSignals
      : FALLBACK_SIGNALS;
  const recentInteractions =
    Array.isArray(safeState.recentInteractions) && safeState.recentInteractions.length
      ? safeState.recentInteractions.map((entry) => ({
          kind: normalizeInteractionKind(entry?.kind || inferInteractionKind(entry)),
          title: entry?.title || 'Companion signal',
          detail: entry?.detail || 'No detail published yet.',
          timestamp: entry?.timestamp || 'Pending',
          source: entry?.source || 'Memory',
        }))
      : FALLBACK_INTERACTIONS;

  return {
    petName: safeState.petName || 'Companion',
    statusLine: safeState.statusLine || 'Waiting for the first local update.',
    loopMode: safeState.loopMode || 'Local placeholder loop',
    lastCheckIn: safeState.lastCheckIn || 'Pending',
    adapterLabel: safeState.adapterLabel || 'Local stub',
    loopHint:
      safeState.loopHint || 'Wire a real endpoint later without changing the browser shell.',
    mood: {
      label: mood.label || 'Settling',
      note: mood.note || 'No mood note has been published yet.',
    },
    memoryTitle: safeState.memoryTitle || 'Memory summary',
    memorySummary:
      safeState.memorySummary ||
      'No memory summary is available yet. The prototype stays useful even before backend contracts exist.',
    vitals,
    recentSignals,
    recentInteractions,
  };
}

function renderMetrics(vitals) {
  return vitals
    .map(
      (entry) => `
        <article class="metric-card">
          <span class="metric-label">${escapeHtml(entry.label || 'State')}</span>
          <strong class="metric-value">${escapeHtml(entry.value || 'Unknown')}</strong>
        </article>
      `,
    )
    .join('');
}

function renderSignals(signals) {
  return signals
    .map((signal) => `<li class="signal-item">${escapeHtml(signal)}</li>`)
    .join('');
}

function buildInteractionFilterOptions(interactions) {
  const counts = interactions.reduce(
    (accumulator, interaction) => {
      accumulator.all += 1;
      accumulator[interaction.kind] = (accumulator[interaction.kind] || 0) + 1;
      return accumulator;
    },
    { all: 0, pat: 0, feed: 0, wake: 0, signal: 0, fallback: 0 },
  );

  return INTERACTION_FILTER_ORDER.map((kind) => ({
    kind,
    label: getInteractionKindLabel(kind),
    count: counts[kind] || 0,
  }));
}

function renderInteractionFilters(interactions, selectedFilter) {
  return buildInteractionFilterOptions(interactions)
    .map(
      (option) => `
        <button
          class="timeline-filter${option.kind === selectedFilter ? ' is-active' : ''}"
          type="button"
          data-role="timeline-filter"
          data-filter-kind="${escapeHtml(option.kind)}"
          aria-pressed="${option.kind === selectedFilter ? 'true' : 'false'}"
        >
          <span>${escapeHtml(option.label)}</span>
          <span class="timeline-filter-count">${escapeHtml(option.count)}</span>
        </button>
      `,
    )
    .join('');
}

function renderInteractions(interactions, selectedFilter) {
  const normalizedFilter = normalizeInteractionFilter(selectedFilter);
  const filteredInteractions =
    normalizedFilter === 'all'
      ? interactions
      : interactions.filter((interaction) => interaction.kind === normalizedFilter);

  if (filteredInteractions.length === 0) {
    return `
      <div class="timeline-empty" data-role="timeline-empty">
        No ${escapeHtml(getInteractionKindLabel(normalizedFilter).toLowerCase())} interactions yet.
      </div>
    `;
  }

  return filteredInteractions
    .map((interaction) => {
      const time = formatInteractionTimestamp(interaction.timestamp);
      const kindLabel = getInteractionKindLabel(interaction.kind);

      return `
        <article class="interaction-card interaction-card-${escapeHtml(interaction.kind)}">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${escapeHtml(interaction.title)}</h3>
              <p class="interaction-detail">${escapeHtml(interaction.detail)}</p>
            </div>
            <div class="interaction-meta">
              <span class="interaction-kind interaction-kind-${escapeHtml(interaction.kind)}">${escapeHtml(kindLabel)}</span>
              <span class="interaction-source">${escapeHtml(interaction.source)}</span>
            </div>
          </div>
          <time
            class="interaction-time"
            ${time.machine ? `datetime="${escapeHtml(time.machine)}"` : ''}
            ${time.exact ? `title="${escapeHtml(time.exact)}"` : ''}
          >${escapeHtml(time.label)}</time>
        </article>
      `;
    })
    .join('');
}

function createStateMarkup(rawState, selectedFilter = 'all') {
  const state = normalizeState(rawState);
  const normalizedFilter = normalizeInteractionFilter(selectedFilter);

  return `
    <div class="panel-grid">
      <section class="panel panel-pet" aria-labelledby="companion-name">
        <div class="pet-avatar" aria-hidden="true">
          <span class="pet-core"></span>
        </div>
        <div class="panel-copy-stack">
          <p class="section-label">Companion</p>
          <h2 id="companion-name">${escapeHtml(state.petName)}</h2>
          <p class="status-line">${escapeHtml(state.statusLine)}</p>
          <dl class="meta-list">
            <div>
              <dt>Loop mode</dt>
              <dd>${escapeHtml(state.loopMode)}</dd>
            </div>
            <div>
              <dt>Last check-in</dt>
              <dd>${escapeHtml(state.lastCheckIn)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="panel" aria-labelledby="mood-heading">
        <p class="section-label">Mood</p>
        <h2 id="mood-heading">${escapeHtml(state.mood.label)}</h2>
        <p class="panel-copy">${escapeHtml(state.mood.note)}</p>
        <p class="hint-text">${escapeHtml(state.loopHint)}</p>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${escapeHtml(state.memoryTitle)}</h2>
        <p class="panel-copy">${escapeHtml(state.memorySummary)}</p>
        <ul class="signal-list">
          ${renderSignals(state.recentSignals)}
        </ul>
      </section>

      <section class="panel panel-history" aria-labelledby="timeline-heading">
        <p class="section-label">Recent interactions</p>
        <h2 id="timeline-heading">Companion timeline</h2>
        <div class="timeline-filter-bar" data-role="timeline-filter-bar">
          ${renderInteractionFilters(state.recentInteractions, normalizedFilter)}
        </div>
        <div class="interaction-list">
          ${renderInteractions(state.recentInteractions, normalizedFilter)}
        </div>
      </section>

      <section class="panel panel-wide" aria-labelledby="widgets-heading">
        <p class="section-label">State widgets</p>
        <h2 id="widgets-heading">Pet loop snapshot</h2>
        <div class="metric-grid">
          ${renderMetrics(state.vitals)}
        </div>
      </section>
    </div>
  `;
}

function createErrorMarkup(error) {
  const message = error instanceof Error ? error.message : 'Unknown adapter error';

  return `
    <section class="panel panel-error" aria-live="polite">
      <p class="section-label">Adapter state</p>
      <h2>Companion unavailable</h2>
      <p class="panel-copy">${escapeHtml(message)}</p>
      <p class="hint-text">The surface stays bootable even when the local adapter cannot provide state.</p>
    </section>
  `;
}

function createShellMarkup() {
  return `
    <main class="companion-shell" data-surface="pet-companion">
      <section class="hero-card">
        <div class="hero-copy">
          <p class="eyebrow">Pet companion prototype</p>
          <h1>Browser buddy without the admin shell</h1>
          <p class="hero-note">
            A lightweight Vite surface that proves the pet loop visually with local mood, state, and memory placeholders.
          </p>
        </div>
        <div class="hero-actions">
          <span class="status-pill" data-role="adapter-status">Adapter: local stub</span>
          <div class="note-stack">
            <label class="note-label" for="action-note">Interaction note</label>
            <textarea
              class="note-input"
              id="action-note"
              data-role="action-note"
              rows="3"
              maxlength="160"
              placeholder="Optional note for the next pat, feed, or wake."
            ></textarea>
            <p class="note-hint">Optional context travels into the companion timeline.</p>
          </div>
          <div class="companion-actions" data-role="action-buttons">
            <button class="action-button" type="button" data-action="pat">Pat</button>
            <button class="action-button" type="button" data-action="feed">Feed</button>
            <button class="action-button" type="button" data-action="wake">Wake</button>
          </div>
          <button class="refresh-button" type="button" data-action="refresh">Refresh mood</button>
        </div>
      </section>

      <section class="companion-stage" data-role="content" aria-live="polite">
        <div class="loading-panel">Loading local companion state...</div>
      </section>
    </main>
  `;
}

export async function renderPetCompanion(target, { adapter = createLocalPetAdapter() } = {}) {
  if (!target) {
    throw new Error('A target element is required to render the pet companion surface.');
  }

  target.innerHTML = createShellMarkup();

  const content = target.querySelector('[data-role="content"]');
  const refreshButton = target.querySelector('[data-action="refresh"]');
  const adapterStatus = target.querySelector('[data-role="adapter-status"]');
  const actionNote = target.querySelector('[data-role="action-note"]');
  const actionButtons = [...target.querySelectorAll('[data-role="action-buttons"] [data-action]')];
  let selectedTimelineFilter = 'all';
  let latestState = null;

  function syncLinkedActionButtons() {
    actionButtons.forEach((button) => {
      const action = button.getAttribute('data-action');
      const linked = action === selectedTimelineFilter;
      button.classList.toggle('is-linked', linked);
      button.setAttribute('data-filter-linked', linked ? 'true' : 'false');
    });
  }

  function setControlsDisabled(disabled) {
    refreshButton.disabled = disabled;
    actionButtons.forEach((button) => {
      button.disabled = disabled;
    });
    if (actionNote) {
      actionNote.disabled = disabled;
    }
  }

  function renderCurrentState() {
    if (!latestState) {
      syncLinkedActionButtons();
      return;
    }

    content.innerHTML = createStateMarkup(latestState, selectedTimelineFilter);
    syncLinkedActionButtons();
    const filterButtons = [...content.querySelectorAll('[data-role="timeline-filter"]')];
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextFilter = normalizeInteractionFilter(button.getAttribute('data-filter-kind'));
        if (nextFilter === selectedTimelineFilter) {
          return;
        }
        selectedTimelineFilter = nextFilter;
        renderCurrentState();
      });
    });
  }

  async function loadState() {
    setControlsDisabled(true);
    refreshButton.textContent = 'Refreshing...';
    adapterStatus.textContent = 'Adapter: syncing local loop';

    try {
      const state = await adapter.getCompanionState();
      const normalized = normalizeState(state);
      latestState = normalized;
      renderCurrentState();
      adapterStatus.textContent = `Adapter: ${normalized.adapterLabel}`;
    } catch (error) {
      latestState = null;
      content.innerHTML = createErrorMarkup(error);
      adapterStatus.textContent = 'Adapter: degraded';
    } finally {
      setControlsDisabled(false);
      refreshButton.textContent = 'Refresh mood';
    }
  }

  for (const button of actionButtons) {
    button.addEventListener('click', async () => {
      const action = button.getAttribute('data-action');
      if (!action || typeof adapter.performAction !== 'function') {
        return;
      }

      const note = typeof actionNote?.value === 'string' ? actionNote.value.trim() : '';

      setControlsDisabled(true);
      adapterStatus.textContent = `Adapter: sending ${action}`;

      try {
        await adapter.performAction(action, note || undefined);
        selectedTimelineFilter = normalizeInteractionFilter(action);
        if (actionNote) {
          actionNote.value = '';
        }
        await loadState();
      } catch (error) {
        content.innerHTML = createErrorMarkup(error);
        adapterStatus.textContent = 'Adapter: action failed';
        setControlsDisabled(false);
      }
    });
  }

  refreshButton.addEventListener('click', () => {
    void loadState();
  });

  syncLinkedActionButtons();
  await loadState();

  return {
    reload: loadState,
  };
}
