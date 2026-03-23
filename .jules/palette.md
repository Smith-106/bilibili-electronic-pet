# Palette's Journal

## 2026-03-24 - [Dynamic Table Accessibility]
**Learning:** Dynamically generated interactive elements (like checkboxes and textareas in table rows) often miss ARIA labels because they are injected via raw `innerHTML` template strings, bypassing typical component accessibility checks.
**Action:** Always ensure `aria-label` attributes are included in string templates when generating lists of forms or actions (e.g., `aria-label="选择任务 ${jobId}"`).

## 2026-03-22 - [Admin Dashboard UX Improvement]
**Learning:** Even a simple JSON dump can benefit from micro-UX. Adding a clear loading state with ARIA attributes and a manual refresh trigger makes the interface feel more reliable and interactive.
**Action:** Use `role="status"` and `aria-live="polite"` for loading states, and always provide an actionable retry path for data-fetching failures.
