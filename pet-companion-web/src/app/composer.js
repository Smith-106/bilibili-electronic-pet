/**
 * Composer (note + template + guide) DOM synchronization.
 * Extracted from app.js (pure extraction, no behavior change).
 *
 * The composer block only depends on (selectedTimelineFilter, pendingTemplateValue,
 * the filter's template set). app.js caches the render signature and only calls this
 * when that signature changes, so typing in the note field does not rebuild the DOM
 * or re-attach listeners (the prior per-keystroke full-innerHTML rebuild).
 */

import { escapeHtml } from './format.js';
import {
  getComposerCopy,
  getComposerGuide,
  getComposerStatus,
  getComposerTemplates,
  getInteractionKindLabel,
  normalizeInteractionFilter,
} from './interaction.js';

/**
 * Sync the composer DOM against the current filter + pending template state.
 * `ctx` is supplied by app.js and carries the wired element refs plus the
 * state accessors/mutators the listeners need.
 */
export function syncComposerContextDom(ctx) {
  const {
    refs,
    selectedTimelineFilter,
    pendingTemplateValue,
    shouldRebuild,
    clearPendingTemplateAction,
    applyTemplateToDraft,
    setTimelineFilter,
    announce,
  } = ctx;

  const {
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
  } = refs;

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

  // The template/merge/guide DOM block only changes when the filter or pending
  // template changes; the caller gates it so typing does not rebuild it.
  if (!shouldRebuild) {
    return;
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
              ctx.setPendingTemplateValue(nextTemplateValue);
              ctx.syncComposerContext();
              announce('Template selected. Choose Replace, Append, or Cancel.');
              return;
            }

            actionNote.value = nextTemplateValue;
            actionNote.focus();
            clearPendingTemplateAction();
            ctx.syncComposerContext();
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
          ctx.syncComposerContext();
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

/**
 * The signature app.js caches to decide whether a re-render is needed.
 * Exposed so the signature stays the single source of truth.
 */
export function composerSignature(selectedTimelineFilter, pendingTemplateValue) {
  const composerTemplateState = getComposerTemplates(selectedTimelineFilter);
  return `${selectedTimelineFilter}::${pendingTemplateValue ?? ''}::${composerTemplateState ? composerTemplateState.templates.join('|') : ''}`;
}
