# Palette's Journal

## 2026-03-24 - [Dynamic Table Accessibility]
**Learning:** Dynamically generated interactive elements (like checkboxes and textareas in table rows) often miss ARIA labels because they are injected via raw `innerHTML` template strings, bypassing typical component accessibility checks.
**Action:** Always ensure `aria-label` attributes are included in string templates when generating lists of forms or actions (e.g., `aria-label="选择任务 ${jobId}"`).

## 2026-03-22 - [Admin Dashboard UX Improvement]
**Learning:** Even a simple JSON dump can benefit from micro-UX. Adding a clear loading state with ARIA attributes and a manual refresh trigger makes the interface feel more reliable and interactive.
**Action:** Use `role="status"` and `aria-live="polite"` for loading states, and always provide an actionable retry path for data-fetching failures.

## 2026-03-25 - [Vanilla JS State Preservation]
**Learning:** In vanilla JS template-based views, fully replacing `innerHTML` on refresh destroys existing UI context, causing jarring layout shifts and losing focus.
**Action:** Before applying a global loading state, check if interactive elements (like refresh buttons) already exist. If so, modify their state (e.g., `disabled=true`, text update) to provide inline feedback instead of wiping the entire DOM.

## 2026-03-26 - [Visual Confirmation for Async Refreshes]
**Learning:** Even when buttons correctly display a "Refreshing..." state, users lack definitive feedback when the update completes if the resulting data hasn't changed drastically. A visual "Last updated" timestamp provides this explicit confirmation.
**Action:** When creating simple data dashboards, pair the refresh trigger with a visual timestamp so users aren't forced to guess whether the fetch succeeded or parse the raw payload.

## 2026-03-26 - [Interactive Button States in Vanilla Views]
**Learning:** Basic interactive elements like `<button>` naturally lack strong visible focus rings or hover states when using basic inline CSS in vanilla JS templates, leading to poor keyboard accessibility and an unresponsive feel.
**Action:** Rather than maintaining inline styles, always establish a small global CSS reset (e.g., `style.css`) that defines a clear `:focus-visible` outline and `:hover` state for buttons, ensuring universal keyboard accessibility without cluttering the template markup.

## 2026-03-26 - [Scrollable Area Accessibility]
**Learning:** Long blocks of content with `overflow: auto` (like JSON dumps in `<pre>` tags) cannot be scrolled by keyboard-only users unless the element itself is focusable. Screen readers also need context for what the region contains.
**Action:** Always add `tabindex="0"` and an `aria-label` to scrollable content areas (like `<pre>` or custom scroll containers), and ensure they have a visible `:focus-visible` state so keyboard users can track their focus context before scrolling.

## 2026-03-26 - [Micro-UX for Raw Data Dumps]
**Learning:** When presenting users with raw data dumps (like JSON or configuration states), reading isn't their only goal—they often need to extract the data for debugging elsewhere. Manually selecting text in a `<pre>` block is error-prone and tedious.
**Action:** Always pair raw data dumps with a one-click "Copy to Clipboard" action that provides immediate, localized visual feedback (e.g., temporarily changing the button text to "Copied!") and updates its `aria-label` to confirm the action succeeded to screen readers.

## 2026-03-26 - [Inline Loading Indicators for Data Tables]
**Learning:** In dashboards where data is refreshed frequently, clearing a table's contents before a fetch without providing an immediate "Loading" row causes a jarring "blank" state. This makes the interface feel broken or slow.
**Action:** Before initiating any async table data fetch, inject a single placeholder row with a "Loading..." message and a spinning emoji/icon. This provides immediate visual feedback that an action is in progress and preserves the layout's structural expectations.

## 2026-03-26 - [Converting Static Spans to Accessible Controls]
**Learning:** Designers often use `<span>` or `<div>` with click handlers for secondary actions (like filtering by a status badge), but these are invisible to keyboard users and screen readers.
**Action:** When making a non-interactive element clickable, always add `role="button"` and `tabindex="0"`. Additionally, implement a global or local keyboard listener for "Enter" and "Space" to ensure parity between mouse and keyboard interaction.