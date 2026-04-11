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
const ACTION_INTERACTION_KINDS = ['pat', 'feed', 'wake'];

function getFilterShortcut(index) {
  return {
    key: String(index + 1),
    label: `Alt+${index + 1}`,
  };
}

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

function isActionFilter(filter) {
  return ACTION_INTERACTION_KINDS.includes(normalizeInteractionFilter(filter));
}

function getComposerCopy(filter) {
  const normalizedFilter = normalizeInteractionFilter(filter);
  if (normalizedFilter === 'pat') {
    return {
      label: 'Pat note',
      placeholder: 'Optional note for the next pat.',
      hint: 'Describe the comfort, bond, or calming signal you want the timeline to capture. Press Ctrl+Enter to send.',
    };
  }
  if (normalizedFilter === 'feed') {
    return {
      label: 'Feed note',
      placeholder: 'Optional note for the next feed.',
      hint: 'Add snack, refill, or appetite context so the feed entry reads clearly later. Press Ctrl+Enter to send.',
    };
  }
  if (normalizedFilter === 'wake') {
    return {
      label: 'Wake note',
      placeholder: 'Optional note for the next wake.',
      hint: 'Explain the nudge or prompt that should bring the companion back into motion. Press Ctrl+Enter to send.',
    };
  }
  return {
    label: 'Interaction note',
    placeholder: 'Optional note for the next pat, feed, or wake.',
    hint: 'Optional context travels into the companion timeline.',
  };
}

function getComposerGuide(filter) {
  const normalizedFilter = normalizeInteractionFilter(filter);
  if (isActionFilter(normalizedFilter)) {
    return null;
  }

  if (normalizedFilter === 'signal') {
    return {
      message: 'Signal entries are read-only snapshots. Pick Pat, Feed, or Wake to focus the composer on a writable action.',
      shortcuts: ACTION_INTERACTION_KINDS,
    };
  }

  if (normalizedFilter === 'fallback') {
    return {
      message: 'Fallback entries describe degraded state only. Switch to Pat, Feed, or Wake before drafting the next note.',
      shortcuts: ACTION_INTERACTION_KINDS,
    };
  }

  return {
    message: 'Notes publish through Pat, Feed, or Wake actions. Pick one to focus the composer before writing.',
    shortcuts: ACTION_INTERACTION_KINDS,
  };
}

function getComposerTemplates(filter) {
  const normalizedFilter = normalizeInteractionFilter(filter);
  if (normalizedFilter === 'pat') {
    return {
      label: 'Suggested pat notes',
      templates: [
        'Soft pat settled Mochi into a calmer loop.',
        'Bond signal ticked upward after a gentle tap.',
        'Comfort pass landed right on time for the next check-in.',
      ],
    };
  }
  if (normalizedFilter === 'feed') {
    return {
      label: 'Suggested feed notes',
      templates: [
        'Refilled snack tray and appetite stabilized.',
        'Quick bite restored energy before the next loop window.',
        'Treat drop landed cleanly and hunger signal eased.',
      ],
    };
  }
  if (normalizedFilter === 'wake') {
    return {
      label: 'Suggested wake notes',
      templates: [
        'Bright nudge reopened the interaction window.',
        'Wake pulse brought Mochi back into active mode.',
        'Gentle prompt resumed the browser buddy loop.',
      ],
    };
  }
  return null;
}

function getComposerStatus(filter, draftValue, pendingTemplateValue) {
  const normalizedFilter = normalizeInteractionFilter(filter);
  const trimmedDraft = String(draftValue ?? '').trim();

  if (pendingTemplateValue) {
    return {
      label: 'Template waiting',
      detail: 'Choose Replace, Append, or Cancel to resolve the current draft.',
      tone: 'pending',
    };
  }

  if (trimmedDraft) {
    if (isActionFilter(normalizedFilter)) {
      return {
        label: `${getInteractionKindLabel(normalizedFilter)} draft ready`,
        detail: `Will publish with the next ${getInteractionKindLabel(normalizedFilter).toLowerCase()} action.`,
        tone: 'ready',
      };
    }

    return {
      label: 'Draft waiting',
      detail: 'Pick Pat, Feed, or Wake to send this note.',
      tone: 'pending',
    };
  }

  if (isActionFilter(normalizedFilter)) {
    return {
      label: `${getInteractionKindLabel(normalizedFilter)} draft empty`,
      detail: 'Type a note or pick a template to stage the next action.',
      tone: 'idle',
    };
  }

  return {
    label: 'Composer idle',
    detail: 'Select Pat, Feed, or Wake to focus the draft composer.',
    tone: 'idle',
  };
}

function renderShortcutHelpItems() {
  const filterItems = INTERACTION_FILTER_ORDER.map(
    (kind, index) => `
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">${escapeHtml(getFilterShortcut(index).label)}</span>
        <span>${escapeHtml(`Switch timeline to ${getInteractionKindLabel(kind)}.`)}</span>
      </li>
    `,
  ).join('');

  return `
    <ul class="shortcut-help-list">
      ${filterItems}
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">Ctrl+Enter</span>
        <span>Send the selected Pat, Feed, or Wake action.</span>
      </li>
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">Cmd+Enter</span>
        <span>Send the selected action on macOS.</span>
      </li>
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">?</span>
        <span>Toggle this shortcut help card.</span>
      </li>
      <li class="shortcut-help-item">
        <span class="shortcut-help-key">Esc</span>
        <span>Dismiss template merge prompts or close the shortcut card.</span>
      </li>
    </ul>
  `;
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
          <div class="hero-utility-row">
            <span class="status-pill" data-role="adapter-status">Adapter: local stub</span>
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
            <p class="shortcut-help-title">Keyboard shortcuts</p>
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

export async function renderPetCompanion(target, { adapter = createLocalPetAdapter() } = {}) {
  if (!target) {
    throw new Error('A target element is required to render the pet companion surface.');
  }

  target.innerHTML = createShellMarkup();

  const content = target.querySelector('[data-role="content"]');
  const refreshButton = target.querySelector('[data-action="refresh"]');
  const adapterStatus = target.querySelector('[data-role="adapter-status"]');
  const shortcutHelpToggle = target.querySelector('[data-role="shortcut-help-toggle"]');
  const shortcutHelp = target.querySelector('[data-role="shortcut-help"]');
  const liveRegion = target.querySelector('[data-role="live-region"]');
  const actionNote = target.querySelector('[data-role="action-note"]');
  const actionNoteLabel = target.querySelector('[data-role="action-note-label"]');
  const actionNoteHint = target.querySelector('[data-role="action-note-hint"]');
  const actionNoteStatus = target.querySelector('[data-role="action-note-status"]');
  const actionNoteStatusLabel = target.querySelector('[data-role="action-note-status-label"]');
  const actionNoteStatusDetail = target.querySelector('[data-role="action-note-status-detail"]');
  const actionNoteClear = target.querySelector('[data-role="action-note-clear"]');
  const composerTemplates = target.querySelector('[data-role="composer-templates"]');
  const composerTemplateActions = target.querySelector('[data-role="composer-template-actions"]');
  const composerGuide = target.querySelector('[data-role="composer-guide"]');
  const actionButtons = [...target.querySelectorAll('[data-role="action-buttons"] [data-action]')];
  let selectedTimelineFilter = 'all';
  let latestState = null;
  let pendingTemplateValue = null;
  let showShortcutHelp = false;
  let lastAnnouncement = '';

  function isEditableTarget(node) {
    return Boolean(
      node &&
        typeof node === 'object' &&
        'tagName' in node &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(String(node.tagName).toUpperCase()),
    );
  }

  function syncLinkedActionButtons() {
    actionButtons.forEach((button) => {
      const action = button.getAttribute('data-action');
      const linked = action === selectedTimelineFilter;
      button.classList.toggle('is-linked', linked);
      button.setAttribute('data-filter-linked', linked ? 'true' : 'false');
    });
  }

  function announce(message) {
    const text = String(message ?? '').trim();
    if (!liveRegion || !text) {
      return;
    }
    if (lastAnnouncement === text) {
      liveRegion.textContent = '';
    }
    lastAnnouncement = text;
    liveRegion.textContent = text;
  }

  function syncShortcutHelp() {
    if (shortcutHelpToggle) {
      shortcutHelpToggle.setAttribute('aria-expanded', showShortcutHelp ? 'true' : 'false');
      shortcutHelpToggle.classList.toggle('is-active', showShortcutHelp);
    }
    if (shortcutHelp) {
      shortcutHelp.hidden = !showShortcutHelp;
    }
  }

  function setShortcutHelpVisible(nextVisible, announcement) {
    showShortcutHelp = nextVisible;
    syncShortcutHelp();
    if (announcement) {
      announce(announcement);
    }
  }

  function setTimelineFilter(nextFilter, { announcement } = {}) {
    const normalized = normalizeInteractionFilter(nextFilter);
    if (normalized === selectedTimelineFilter) {
      return;
    }
    clearPendingTemplateAction();
    selectedTimelineFilter = normalized;
    renderCurrentState();
    if (announcement) {
      announce(announcement);
    }
  }

  function clearPendingTemplateAction() {
    pendingTemplateValue = null;
  }

  function clearDraft() {
    if (actionNote) {
      actionNote.value = '';
      actionNote.focus();
    }
    clearPendingTemplateAction();
    syncComposerContext();
    announce('Draft cleared.');
  }

  function applyTemplateToDraft(mode) {
    if (!actionNote || !pendingTemplateValue) {
      return;
    }

    const existingValue = actionNote.value.trim();
    if (mode === 'append' && existingValue) {
      actionNote.value = `${existingValue}\n${pendingTemplateValue}`;
    } else {
      actionNote.value = pendingTemplateValue;
    }

    actionNote.focus();
    clearPendingTemplateAction();
    syncComposerContext();
    announce(
      `${getInteractionKindLabel(selectedTimelineFilter)} template ${mode === 'append' ? 'appended to' : 'replaced'} draft.`,
    );
  }

  function syncComposerContext() {
    const composerCopy = getComposerCopy(selectedTimelineFilter);
    const composerStatus = getComposerStatus(selectedTimelineFilter, actionNote?.value, pendingTemplateValue);
    const composerTemplateState = getComposerTemplates(selectedTimelineFilter);
    const composerGuideState = getComposerGuide(selectedTimelineFilter);
    const hasDraft = Boolean(actionNote?.value.trim()) || Boolean(pendingTemplateValue);
    if (actionNoteLabel) {
      actionNoteLabel.textContent = composerCopy.label;
    }
    if (actionNote) {
      actionNote.placeholder = composerCopy.placeholder;
      actionNote.setAttribute('data-composer-kind', normalizeInteractionFilter(selectedTimelineFilter));
    }
    if (actionNoteHint) {
      actionNoteHint.textContent = composerCopy.hint;
    }
    if (actionNoteStatus) {
      actionNoteStatus.setAttribute('data-status-tone', composerStatus.tone);
    }
    if (actionNoteStatusLabel) {
      actionNoteStatusLabel.textContent = composerStatus.label;
    }
    if (actionNoteStatusDetail) {
      actionNoteStatusDetail.textContent = composerStatus.detail;
    }
    if (actionNoteClear) {
      actionNoteClear.disabled = !hasDraft;
    }
    if (composerTemplates) {
      if (!composerTemplateState) {
        composerTemplates.innerHTML = '';
        composerTemplates.hidden = true;
      } else {
        composerTemplates.hidden = false;
        composerTemplates.innerHTML = `
          <p class="composer-templates-label">${escapeHtml(composerTemplateState.label)}</p>
          <div class="composer-template-list">
            ${composerTemplateState.templates
              .map(
                (template) => `
                  <button
                    class="composer-template"
                    type="button"
                    data-role="composer-template"
                    data-template-value="${escapeHtml(template)}"
                  >${escapeHtml(template)}</button>
                `,
              )
              .join('')}
          </div>
        `;

        const templateButtons = [...composerTemplates.querySelectorAll('[data-role="composer-template"]')];
        templateButtons.forEach((button) => {
          button.addEventListener('click', () => {
            if (actionNote) {
              const nextTemplateValue = button.getAttribute('data-template-value') ?? '';
              const existingValue = actionNote.value.trim();

              if (existingValue && existingValue !== nextTemplateValue) {
                pendingTemplateValue = nextTemplateValue;
                syncComposerContext();
                announce('Template selected. Choose Replace, Append, or Cancel.');
                return;
              }

              actionNote.value = nextTemplateValue;
              actionNote.focus();
              clearPendingTemplateAction();
              syncComposerContext();
              announce(`${getInteractionKindLabel(selectedTimelineFilter)} template inserted into draft.`);
            }
          });
        });
      }
    }
    if (composerTemplateActions) {
      if (!pendingTemplateValue || !composerTemplateState) {
        composerTemplateActions.innerHTML = '';
        composerTemplateActions.hidden = true;
      } else {
        composerTemplateActions.hidden = false;
        composerTemplateActions.innerHTML = `
          <p class="composer-template-actions-copy">
            Keep the current draft, append the suggestion, or replace it with:
            <span class="composer-template-preview">${escapeHtml(pendingTemplateValue)}</span>
          </p>
          <p class="composer-template-actions-hint">Press Esc to cancel this merge.</p>
          <div class="composer-template-action-row">
            <button class="composer-template-action" type="button" data-role="template-merge-action" data-merge-mode="replace">
              Replace
            </button>
            <button class="composer-template-action" type="button" data-role="template-merge-action" data-merge-mode="append">
              Append
            </button>
            <button class="composer-template-action is-ghost" type="button" data-role="template-merge-action" data-merge-mode="cancel">
              Cancel
            </button>
          </div>
        `;

        const mergeButtons = [...composerTemplateActions.querySelectorAll('[data-role="template-merge-action"]')];
        mergeButtons.forEach((button) => {
          button.addEventListener('click', () => {
            const mergeMode = button.getAttribute('data-merge-mode');
            if (mergeMode === 'replace' || mergeMode === 'append') {
              applyTemplateToDraft(mergeMode);
              return;
            }
            clearPendingTemplateAction();
            syncComposerContext();
            announce('Template merge cancelled.');
          });
        });
      }
    }
    if (composerGuide) {
      if (!composerGuideState) {
        composerGuide.innerHTML = '';
        composerGuide.hidden = true;
      } else {
        composerGuide.hidden = false;
        composerGuide.innerHTML = `
          <p class="composer-guide-copy">${escapeHtml(composerGuideState.message)}</p>
          <div class="composer-shortcuts">
            ${composerGuideState.shortcuts
              .map(
                (kind) => `
                  <button
                    class="composer-shortcut"
                    type="button"
                    data-role="composer-shortcut"
                    data-shortcut-kind="${escapeHtml(kind)}"
                  >${escapeHtml(getInteractionKindLabel(kind))}</button>
                `,
              )
              .join('')}
          </div>
        `;

        const shortcutButtons = [...composerGuide.querySelectorAll('[data-role="composer-shortcut"]')];
        shortcutButtons.forEach((button) => {
          button.addEventListener('click', () => {
            const nextFilter = normalizeInteractionFilter(button.getAttribute('data-shortcut-kind'));
            setTimelineFilter(nextFilter, {
              announcement: `Timeline filter set to ${getInteractionKindLabel(nextFilter)}.`,
            });
            actionNote?.focus();
          });
        });
      }
    }
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

  actionNote?.addEventListener('input', () => {
    if (pendingTemplateValue) {
      clearPendingTemplateAction();
    }
    syncComposerContext();
  });

  actionNoteClear?.addEventListener('click', () => {
    clearDraft();
  });

  shortcutHelpToggle?.addEventListener('click', () => {
    setShortcutHelpVisible(!showShortcutHelp, `Shortcut help ${showShortcutHelp ? 'closed' : 'opened'}.`);
  });

  target.ownerDocument.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && pendingTemplateValue) {
      event.preventDefault();
      clearPendingTemplateAction();
      syncComposerContext();
      announce('Template merge cancelled.');
      return;
    }

    if (event.key === 'Escape' && showShortcutHelp) {
      event.preventDefault();
      setShortcutHelpVisible(false, 'Shortcut help closed.');
      return;
    }

    if (event.key === '?' && !isEditableTarget(event.target)) {
      event.preventDefault();
      setShortcutHelpVisible(!showShortcutHelp, `Shortcut help ${showShortcutHelp ? 'closed' : 'opened'}.`);
      return;
    }

    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    const filterIndex = Number.parseInt(event.key, 10) - 1;
    if (Number.isNaN(filterIndex) || filterIndex < 0 || filterIndex >= INTERACTION_FILTER_ORDER.length) {
      return;
    }

    event.preventDefault();
    const nextFilter = INTERACTION_FILTER_ORDER[filterIndex];
    setTimelineFilter(nextFilter, { announcement: `Timeline filter set to ${getInteractionKindLabel(nextFilter)}.` });
  });

  async function triggerAction(action) {
    if (!action || typeof adapter.performAction !== 'function') {
      return;
    }

    const note = typeof actionNote?.value === 'string' ? actionNote.value.trim() : '';

    setControlsDisabled(true);
    adapterStatus.textContent = `Adapter: sending ${action}`;
    announce(`Sending ${getInteractionKindLabel(action)} action.`);

    try {
      await adapter.performAction(action, note || undefined);
      clearPendingTemplateAction();
      selectedTimelineFilter = normalizeInteractionFilter(action);
      if (actionNote) {
        actionNote.value = '';
      }
      await loadState();
      announce(`${getInteractionKindLabel(action)} action sent.`);
    } catch (error) {
      content.innerHTML = createErrorMarkup(error);
      adapterStatus.textContent = 'Adapter: action failed';
      setControlsDisabled(false);
      announce(`${getInteractionKindLabel(action)} action failed.`);
    }
  }

  actionNote?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && pendingTemplateValue) {
      event.preventDefault();
      clearPendingTemplateAction();
      syncComposerContext();
      announce('Template merge cancelled.');
      return;
    }

    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && isActionFilter(selectedTimelineFilter)) {
      event.preventDefault();
      void triggerAction(selectedTimelineFilter);
    }
  });

  function renderCurrentState() {
    if (!latestState) {
      syncLinkedActionButtons();
      syncComposerContext();
      return;
    }

    content.innerHTML = createStateMarkup(latestState, selectedTimelineFilter);
    syncLinkedActionButtons();
    syncComposerContext();
    const filterButtons = [...content.querySelectorAll('[data-role="timeline-filter"]')];
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextFilter = normalizeInteractionFilter(button.getAttribute('data-filter-kind'));
        setTimelineFilter(nextFilter, { announcement: `Timeline filter set to ${getInteractionKindLabel(nextFilter)}.` });
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
      await triggerAction(action);
    });
  }

  refreshButton.addEventListener('click', () => {
    void loadState();
  });

  syncLinkedActionButtons();
  syncShortcutHelp();
  syncComposerContext();
  await loadState();

  return {
    reload: loadState,
  };
}
