/**
 * Formatting + escaping helpers for the pet companion surface.
 * Extracted from app.js (pure extraction, no behavior change).
 */

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatPreciseTimestamp(date) {
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export function formatRelativeTime(deltaSeconds, unitSeconds, singularLabel, pluralLabel) {
  const count = Math.max(1, Math.round(Math.abs(deltaSeconds) / unitSeconds));
  const unitLabel = count === 1 ? singularLabel : pluralLabel;
  return deltaSeconds >= 0 ? `${count} ${unitLabel} ago` : `in ${count} ${unitLabel}`;
}

export function formatInteractionTimestamp(timestamp) {
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
