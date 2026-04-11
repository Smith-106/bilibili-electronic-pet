import { createLocalPetAdapter } from './api/local-adapter.js';

const FALLBACK_VITALS = [
  { label: 'Energy', value: 'Unknown' },
  { label: 'Hunger', value: 'Unknown' },
  { label: 'Bond', value: 'Unknown' },
];

const FALLBACK_SIGNALS = ['Local companion loop has not reported any recent signals yet.'];
const FALLBACK_INTERACTIONS = [
  {
    title: 'Companion signal pending',
    detail: 'No structured interaction timeline is available yet.',
    timestamp: 'Pending',
    source: 'Local stub',
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

function renderInteractions(interactions) {
  return interactions
    .map(
      (interaction) => `
        <article class="interaction-card">
          <div class="interaction-head">
            <div>
              <h3 class="interaction-title">${escapeHtml(interaction.title)}</h3>
              <p class="interaction-detail">${escapeHtml(interaction.detail)}</p>
            </div>
            <span class="interaction-source">${escapeHtml(interaction.source)}</span>
          </div>
          <p class="interaction-time">${escapeHtml(interaction.timestamp)}</p>
        </article>
      `,
    )
    .join('');
}

function createStateMarkup(rawState) {
  const state = normalizeState(rawState);

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
        <div class="interaction-list">
          ${renderInteractions(state.recentInteractions)}
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
  const actionButtons = [...target.querySelectorAll('[data-role="action-buttons"] [data-action]')];

  async function loadState() {
    refreshButton.disabled = true;
    actionButtons.forEach((button) => {
      button.disabled = true;
    });
    refreshButton.textContent = 'Refreshing...';
    adapterStatus.textContent = 'Adapter: syncing local loop';

    try {
      const state = await adapter.getCompanionState();
      const normalized = normalizeState(state);
      content.innerHTML = createStateMarkup(normalized);
      adapterStatus.textContent = `Adapter: ${normalized.adapterLabel}`;
    } catch (error) {
      content.innerHTML = createErrorMarkup(error);
      adapterStatus.textContent = 'Adapter: degraded';
    } finally {
      refreshButton.disabled = false;
      actionButtons.forEach((button) => {
        button.disabled = false;
      });
      refreshButton.textContent = 'Refresh mood';
    }
  }

  for (const button of actionButtons) {
    button.addEventListener('click', async () => {
      const action = button.getAttribute('data-action');
      if (!action || typeof adapter.performAction !== 'function') {
        return;
      }

      refreshButton.disabled = true;
      actionButtons.forEach((item) => {
        item.disabled = true;
      });
      adapterStatus.textContent = `Adapter: sending ${action}`;

      try {
        await adapter.performAction(action);
        await loadState();
      } catch (error) {
        content.innerHTML = createErrorMarkup(error);
        adapterStatus.textContent = 'Adapter: action failed';
        refreshButton.disabled = false;
        actionButtons.forEach((item) => {
          item.disabled = false;
        });
      }
    });
  }

  refreshButton.addEventListener('click', () => {
    void loadState();
  });

  await loadState();

  return {
    reload: loadState,
  };
}
