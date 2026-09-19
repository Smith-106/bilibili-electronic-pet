/**
 * Interaction taxonomy + composer copy/state helpers.
 * Extracted from app.js (pure extraction, no behavior change).
 */

import { escapeHtml } from './format.js';

export const FALLBACK_INTERACTIONS = [
  {
    kind: 'signal',
    title: 'Companion signal pending',
    detail: 'No structured interaction timeline is available yet.',
    timestamp: 'Pending',
    source: 'Seed state adapter',
  },
];

export const INTERACTION_FILTER_ORDER = ['all', 'pat', 'feed', 'wake', 'signal', 'fallback'];
export const ACTION_INTERACTION_KINDS = ['pat', 'feed', 'wake'];

export function getFilterShortcut(index) {
  return {
    key: String(index + 1),
    label: `Alt+${index + 1}`,
  };
}

export function normalizeInteractionKind(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'pat' || normalized === 'feed' || normalized === 'wake' || normalized === 'signal') {
    return normalized;
  }
  if (normalized === 'fallback') {
    return 'fallback';
  }
  return 'signal';
}

export function inferInteractionKind(entry) {
  const source = String(entry?.source ?? '').trim().toLowerCase();
  const title = String(entry?.title ?? '').trim().toLowerCase();

  if (source.includes('fallback') || title.includes('fallback') || source.includes('degraded') || title.includes('degraded')) {
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

export function getInteractionKindLabel(kind) {
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
    return 'Degraded';
  }
  return 'Signal';
}

export function normalizeInteractionFilter(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return INTERACTION_FILTER_ORDER.includes(normalized) ? normalized : 'all';
}

export function isActionFilter(filter) {
  return ACTION_INTERACTION_KINDS.includes(normalizeInteractionFilter(filter));
}

export function getComposerCopy(filter) {
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

export function getComposerGuide(filter) {
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
      message: 'Degraded-state entries describe backend recovery only. Switch to Pat, Feed, or Wake before drafting the next note.',
      shortcuts: ACTION_INTERACTION_KINDS,
    };
  }

  return {
    message: 'Notes publish through Pat, Feed, or Wake actions. Pick one to focus the composer before writing.',
    shortcuts: ACTION_INTERACTION_KINDS,
  };
}

export function getComposerSubmitBlockedMessage(filter) {
  const normalizedFilter = normalizeInteractionFilter(filter);
  if (normalizedFilter === 'signal') {
    return 'Signal entries are read-only. Pick Pat, Feed, or Wake before sending.';
  }
  if (normalizedFilter === 'fallback') {
    return 'Degraded-state entries are read-only. Pick Pat, Feed, or Wake before sending.';
  }
  return 'Pick Pat, Feed, or Wake before sending a note.';
}

export function getComposerTemplates(filter) {
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

export function getComposerStatus(filter, draftValue, pendingTemplateValue) {
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

export function renderShortcutHelpItems() {
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
