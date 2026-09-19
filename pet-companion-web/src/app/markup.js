/**
 * Pure markup-string builders for the pet companion surface.
 * Extracted from app.js (pure extraction, no behavior change).
 */

import { escapeHtml, formatInteractionTimestamp } from './format.js';
import {
  INTERACTION_FILTER_ORDER,
  getFilterShortcut,
  getInteractionKindLabel,
  normalizeInteractionFilter,
  renderShortcutHelpItems,
} from './interaction.js';
import { normalizeState } from './state.js';

export function renderMetrics(vitals) {
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

export function renderSignals(signals) {
  return signals
    .map((signal) => `<li class="signal-item">${escapeHtml(signal)}</li>`)
    .join('');
}

export function renderProactiveSignals(signals) {
  if (!signals.length) {
    return '<li class="signal-item">No proactive rituals are scheduled yet.</li>';
  }

  return signals
    .map((signal) => {
      const timing = signal.dueAt ? ` <span class="signal-time">${escapeHtml(signal.dueAt)}</span>` : '';
      return `<li class="signal-item"><strong>${escapeHtml(signal.label)}</strong>: ${escapeHtml(signal.detail)}${timing}</li>`;
    })
    .join('');
}

export function buildInteractionFilterOptions(interactions) {
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

export function renderInteractionFilters(interactions, selectedFilter) {
  return buildInteractionFilterOptions(interactions)
    .map((option, index) => {
      const shortcut = getFilterShortcut(index);

      return `
        <button
          class="timeline-filter${option.kind === selectedFilter ? ' is-active' : ''}"
          type="button"
          data-role="timeline-filter"
          data-filter-kind="${escapeHtml(option.kind)}"
          data-filter-shortcut="${escapeHtml(shortcut.key)}"
          aria-pressed="${option.kind === selectedFilter ? 'true' : 'false'}"
        >
          <span>${escapeHtml(option.label)}</span>
          <span class="timeline-filter-shortcut" aria-hidden="true">${escapeHtml(shortcut.label)}</span>
          <span class="timeline-filter-count">${escapeHtml(option.count)}</span>
        </button>
      `;
    })
    .join('');
}

export function renderInteractions(interactions, selectedFilter) {
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

export function renderDegradedPanel(state) {
  if (!state.degraded) {
    return '';
  }

  const attemptedEndpoints = [state.backendStatus.endpoint, state.backendStatus.legacyEndpoint].filter(Boolean).join(' -> ');

  return `
    <section class="panel panel-degraded" aria-live="polite">
      <p class="section-label">Degraded mode</p>
      <h2>Backend companion state unavailable</h2>
      <p class="panel-copy">
        Showing a labeled degraded backend snapshot so the surface remains explorable without pretending the backend is healthy.
      </p>
      <ul class="signal-list">
        <li class="signal-item"><strong>Surface source:</strong> ${escapeHtml(state.dataSourceLabel)}</li>
        <li class="signal-item"><strong>Backend error:</strong> ${escapeHtml(state.backendStatus.reason || 'backend_unavailable')}</li>
        ${attemptedEndpoints ? `<li class="signal-item"><strong>Attempted endpoints:</strong> ${escapeHtml(attemptedEndpoints)}</li>` : ''}
        <li class="signal-item"><strong>Retry:</strong> ${escapeHtml(state.retryGuidance)}</li>
      </ul>
    </section>
  `;
}

export function renderHighlightCards(cards) {
  return cards
    .map(
      (card) => `
        <article class="hero-highlight hero-highlight-${escapeHtml(card.tone)}">
          <span class="hero-highlight-label">${escapeHtml(card.label)}</span>
          <strong class="hero-highlight-value">${escapeHtml(card.value)}</strong>
          <p class="hero-highlight-detail">${escapeHtml(card.detail)}</p>
        </article>
      `,
    )
    .join('');
}

export function createStateMarkup(rawState, selectedFilter = 'all') {
  const state = normalizeState(rawState);
  const normalizedFilter = normalizeInteractionFilter(selectedFilter);

  return `
    ${renderDegradedPanel(state)}
    <div class="panel-grid">
      <section class="panel panel-highlights" aria-labelledby="surface-status-heading">
        <div class="panel-copy-stack">
          <p class="section-label">Surface status</p>
          <h2 id="surface-status-heading">Companion rhythm at a glance</h2>
          <p class="panel-copy">
            A quick read on connection health, bond direction, next ritual, and the recent timeline cadence.
          </p>
        </div>
        <div class="hero-highlight-grid">
          ${renderHighlightCards(state.highlightCards)}
        </div>
      </section>

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
            <div>
              <dt>Profile</dt>
              <dd>${escapeHtml(
                [state.profile.species, state.profile.archetype].filter(Boolean).join(' · ') || 'Companion profile',
              )}</dd>
            </div>
            <div>
              <dt>Connection</dt>
              <dd>${escapeHtml(state.dataSourceLabel)}</dd>
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

      <section class="panel" aria-labelledby="arc-heading">
        <p class="section-label">Pet arc</p>
        <h2 id="arc-heading">${escapeHtml(state.relationship.level)}</h2>
        <p class="panel-copy">${escapeHtml(state.relationship.note)}</p>
        <ul class="signal-list">
          <li class="signal-item"><strong>Stage:</strong> ${escapeHtml(state.progress.progressLabel)}</li>
          <li class="signal-item"><strong>Ritual:</strong> ${escapeHtml(state.onboarding.title)}</li>
          <li class="signal-item">${escapeHtml(state.onboarding.detail)}</li>
          ${
            state.progress.nextMilestone
              ? `<li class="signal-item"><strong>Next milestone:</strong> ${escapeHtml(state.progress.nextMilestone)}</li>`
              : ''
          }
        </ul>
      </section>

      <section class="panel panel-memory" aria-labelledby="memory-heading">
        <p class="section-label">Memory summary</p>
        <h2 id="memory-heading">${escapeHtml(state.memoryTitle)}</h2>
        <p class="panel-copy">${escapeHtml(state.memorySummary)}</p>
        <ul class="signal-list">
          ${renderSignals(state.recentSignals)}
        </ul>
      </section>

      <section class="panel" aria-labelledby="ritual-heading">
        <p class="section-label">Active rituals</p>
        <h2 id="ritual-heading">Proactive signals</h2>
        <ul class="signal-list">
          ${renderProactiveSignals(state.proactiveSignals)}
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

export function createErrorMarkup(error) {
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

export function createShellMarkup() {
  return `
    <main class="companion-shell" data-surface="pet-companion">
      <section class="hero-card">
        <div class="hero-copy">
          <p class="eyebrow">Pet companion surface</p>
          <h1>A calm browser companion with a readable ritual loop</h1>
          <p class="hero-note">
            This surface turns companion mood, memory, rituals, and interaction history into one pet-facing view that
            can stay understandable even when the backend drops into degraded snapshot mode.
          </p>
        </div>
        <div class="hero-actions">
          <div class="hero-utility-row">
            <span class="status-pill" data-role="adapter-status">Adapter: seed state adapter</span>
            <button
              class="shortcut-help-toggle"
              type="button"
              data-role="shortcut-help-toggle"
              aria-expanded="false"
              aria-controls="shortcut-help-card"
            >
              Shortcuts ?
            </button>
          </div>
          <section
            class="shortcut-help"
            id="shortcut-help-card"
            data-role="shortcut-help"
            aria-live="polite"
            hidden
          >
            <div class="shortcut-help-header">
              <p class="shortcut-help-title" data-role="shortcut-help-title" tabindex="0">Keyboard shortcuts</p>
              <button
                class="shortcut-help-close"
                type="button"
                data-role="shortcut-help-close"
                aria-label="Close shortcut help"
              >
                Close
              </button>
            </div>
            ${renderShortcutHelpItems()}
          </section>
          <div class="sr-only" data-role="live-region" aria-live="polite" aria-atomic="true"></div>
          <div class="note-stack">
            <label class="note-label" data-role="action-note-label" for="action-note">Interaction note</label>
            <textarea
              class="note-input"
              id="action-note"
              data-role="action-note"
              rows="3"
              maxlength="160"
              placeholder="Optional note for the next pat, feed, or wake."
            ></textarea>
            <p class="note-hint" data-role="action-note-hint">Optional context travels into the companion timeline.</p>
            <div class="note-actions">
              <div class="note-status" data-role="action-note-status" data-status-tone="idle">
                <span class="note-status-label" data-role="action-note-status-label">Composer idle</span>
                <span class="note-status-detail" data-role="action-note-status-detail">
                  Select Pat, Feed, or Wake to focus the draft composer.
                </span>
              </div>
              <button class="note-clear-button" type="button" data-role="action-note-clear">Clear draft</button>
            </div>
            <div class="composer-templates" data-role="composer-templates" hidden></div>
            <div class="composer-template-actions" data-role="composer-template-actions" hidden></div>
            <div class="composer-guide" data-role="composer-guide" hidden></div>
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
