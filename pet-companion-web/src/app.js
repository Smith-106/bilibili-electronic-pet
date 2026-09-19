import { createLocalPetAdapter } from './api/local-adapter.js';
import { formatInteractionTimestamp } from './app/format.js';
import {
  INTERACTION_FILTER_ORDER,
  getComposerCopy,
  getComposerGuide,
  getComposerStatus,
  getComposerSubmitBlockedMessage,
  getComposerTemplates,
  getInteractionKindLabel,
  inferInteractionKind,
  isActionFilter,
  normalizeInteractionFilter,
  normalizeInteractionKind,
} from './app/interaction.js';
import { composerSignature, syncComposerContextDom } from './app/composer.js';
import { normalizeBackendStatus, normalizeState } from './app/state.js';
import {
  createErrorMarkup,
  createStateMarkup,
  createShellMarkup,
  renderDegradedPanel,
  renderInteractions,
  renderProactiveSignals,
} from './app/markup.js';

const RENDER_CLEANUP = Symbol('petCompanionCleanup');

export async function renderPetCompanion(target, { adapter = createLocalPetAdapter() } = {}) {
  if (!target) {
    throw new Error('A target element is required to render the pet companion surface.');
  }

  if (typeof target[RENDER_CLEANUP] === 'function') {
    target[RENDER_CLEANUP]();
  }

  target.innerHTML = createShellMarkup();

  const ownerDocument = target.ownerDocument;
  const content = target.querySelector('[data-role="content"]');
  const refreshButton = target.querySelector('[data-action="refresh"]');
  const adapterStatus = target.querySelector('[data-role="adapter-status"]');
  const shortcutHelpToggle = target.querySelector('[data-role="shortcut-help-toggle"]');
  const shortcutHelp = target.querySelector('[data-role="shortcut-help"]');
  const shortcutHelpTitle = target.querySelector('[data-role="shortcut-help-title"]');
  const shortcutHelpClose = target.querySelector('[data-role="shortcut-help-close"]');
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
  // innerHTML 优化: composer 模板/guide 内容只由 (filter, pendingTemplateValue) 决定,
  // 缓存上次渲染签名 — 输入打字 (input → syncComposerContext) 不再重复重建 DOM + 重挂监听.
  let lastComposerSignature = null;

  function setAdapterStatus(message, { degraded = false } = {}) {
    if (!adapterStatus) {
      return;
    }
    adapterStatus.textContent = message;
    adapterStatus.classList.toggle('is-degraded', degraded);
  }

  function isEditableTarget(node) {
    return Boolean(
      node &&
        typeof node === 'object' &&
        'tagName' in node &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(String(node.tagName).toUpperCase()),
    );
  }

  function getFocusableTarget(node) {
    if (!node || typeof node !== 'object' || !('closest' in node)) {
      return null;
    }

    return node.closest(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]',
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

  function focusShortcutHelpBoundary(reverse = false) {
    const focusables = [shortcutHelpTitle, shortcutHelpClose].filter(Boolean);
    const targetNode = reverse ? focusables[focusables.length - 1] : focusables[0];
    targetNode?.focus();
  }

  function setShortcutHelpVisible(nextVisible, announcement, { moveFocus = false } = {}) {
    showShortcutHelp = nextVisible;
    syncShortcutHelp();
    if (moveFocus) {
      if (nextVisible) {
        shortcutHelpTitle?.focus();
      } else {
        shortcutHelpToggle?.focus();
      }
    }
    announce(announcement);
  }

  function isShortcutHelpTarget(node) {
    return Boolean(node && (shortcutHelp?.contains(node) || shortcutHelpToggle?.contains(node)));
  }

  function setTimelineFilter(nextFilter, { announcement } = {}) {
    const normalized = normalizeInteractionFilter(nextFilter);
    if (normalized === selectedTimelineFilter) {
      return;
    }
    clearPendingTemplateAction();
    selectedTimelineFilter = normalized;
    renderCurrentState();
    announce(announcement);
  }

  function clearPendingTemplateAction() {
    pendingTemplateValue = null;
  }

  function clearDraft() {
    actionNote.value = '';
    actionNote.focus();
    clearPendingTemplateAction();
    syncComposerContext();
    announce('Draft cleared.');
  }

  function applyTemplateToDraft(mode) {
    if (!pendingTemplateValue) {
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

  function setPendingTemplateValue(value) {
    pendingTemplateValue = value;
  }

  const composerRefs = {
    actionNote,
    actionNoteLabel,
    actionNoteHint,
    actionNoteStatus,
    actionNoteStatusLabel,
    actionNoteStatusDetail,
    actionNoteClear,
    composerTemplates,
    composerTemplateActions,
    composerGuide,
  };

  function syncComposerContext(force = true) {
    // Text/status updates run every call (cheap). The innerHTML rebuild is forced for
    // infrequent paths (clicks, filter changes, actions) and only signature-gated for
    // the high-frequency typing path — see syncComposerContextFromInput below.
    const signature = composerSignature(selectedTimelineFilter, pendingTemplateValue);
    const shouldRebuild = force || signature !== lastComposerSignature;
    lastComposerSignature = signature;
    syncComposerContextDom({
      refs: composerRefs,
      selectedTimelineFilter,
      pendingTemplateValue,
      shouldRebuild,
      clearPendingTemplateAction,
      applyTemplateToDraft,
      setPendingTemplateValue,
      setTimelineFilter,
      announce,
      syncComposerContext,
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

  actionNote?.addEventListener('input', () => {
    if (pendingTemplateValue) {
      clearPendingTemplateAction();
    }
    // Typing path: gate the innerHTML rebuild by signature so each keystroke does not
    // rebuild the composer DOM or re-attach listeners (the prior per-keystroke abuse).
    syncComposerContext(false);
  });

  actionNoteClear?.addEventListener('click', () => {
    clearDraft();
  });

  shortcutHelpToggle?.addEventListener('click', () => {
    setShortcutHelpVisible(!showShortcutHelp, `Shortcut help ${showShortcutHelp ? 'closed' : 'opened'}.`, {
      moveFocus: true,
    });
  });

  shortcutHelpClose?.addEventListener('click', () => {
    setShortcutHelpVisible(false, 'Shortcut help closed.', { moveFocus: true });
  });

  function handleDocumentClick(event) {
    if (!showShortcutHelp || isShortcutHelpTarget(event.target)) {
      return;
    }

    const focusableTarget = getFocusableTarget(event.target);
    const activeElementInsideHelp = Boolean(shortcutHelp?.contains(ownerDocument.activeElement));
    setShortcutHelpVisible(false, 'Shortcut help closed.', {
      moveFocus: !focusableTarget && activeElementInsideHelp,
    });
  }

  function handleDocumentKeydown(event) {
    if (event.key === 'Escape' && pendingTemplateValue) {
      event.preventDefault();
      clearPendingTemplateAction();
      syncComposerContext();
      announce('Template merge cancelled.');
      return;
    }

    if (event.key === 'Escape' && showShortcutHelp) {
      event.preventDefault();
      setShortcutHelpVisible(false, 'Shortcut help closed.', { moveFocus: true });
      return;
    }

    if (event.key === 'Tab' && showShortcutHelp) {
      const focusables = [shortcutHelpTitle, shortcutHelpClose].filter(Boolean);
      if (!focusables.length) {
        return;
      }

      const activeElement = target.ownerDocument.activeElement;
      const currentIndex = focusables.indexOf(activeElement);

      if (currentIndex === -1) {
        event.preventDefault();
        if (event.shiftKey) {
          focusShortcutHelpBoundary(true);
        } else {
          focusShortcutHelpBoundary();
        }
        return;
      }

      const nextIndex = event.shiftKey
        ? (currentIndex - 1 + focusables.length) % focusables.length
        : (currentIndex + 1) % focusables.length;
      event.preventDefault();
      focusables[nextIndex]?.focus();
      return;
    }

    if (event.key === '?' && !isEditableTarget(event.target)) {
      event.preventDefault();
      setShortcutHelpVisible(!showShortcutHelp, `Shortcut help ${showShortcutHelp ? 'closed' : 'opened'}.`, {
        moveFocus: true,
      });
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
  }

  ownerDocument.addEventListener('click', handleDocumentClick);
  ownerDocument.addEventListener('keydown', handleDocumentKeydown);

  async function triggerAction(action) {
    if (!action) {
      return;
    }

    if (pendingTemplateValue) {
      announce('Resolve template merge before sending.');
      return;
    }

    if (typeof adapter.performAction !== 'function') {
      setAdapterStatus('Adapter: action unavailable');
      announce(`${getInteractionKindLabel(action)} action is unavailable in the current adapter.`);
      return;
    }

    const note = typeof actionNote?.value === 'string' ? actionNote.value.trim() : '';

    setControlsDisabled(true);
    setAdapterStatus(`Adapter: sending ${action}`);
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
      setAdapterStatus('Adapter: action failed', { degraded: true });
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

    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !isActionFilter(selectedTimelineFilter)) {
      event.preventDefault();
      announce(getComposerSubmitBlockedMessage(selectedTimelineFilter));
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
    setAdapterStatus('Adapter: syncing companion state');
    announce();

    try {
      const state = await adapter.getCompanionState();
      const normalized = normalizeState(state);
      latestState = normalized;
      renderCurrentState();
      setAdapterStatus(`Adapter: ${normalized.adapterLabel}`, { degraded: normalized.degraded });
    } catch (error) {
      latestState = null;
      content.innerHTML = createErrorMarkup(error);
      setAdapterStatus('Adapter: degraded', { degraded: true });
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

  function destroy() {
    ownerDocument.removeEventListener('click', handleDocumentClick);
    ownerDocument.removeEventListener('keydown', handleDocumentKeydown);
    delete target[RENDER_CLEANUP];
  }

  target[RENDER_CLEANUP] = destroy;

  syncLinkedActionButtons();
  syncShortcutHelp();
  syncComposerContext();
  await loadState();

  return {
    destroy,
    reload: loadState,
  };
}

export const __testHooks = {
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
};
