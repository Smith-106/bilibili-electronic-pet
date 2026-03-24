function sanitizeErrorDetail(detail, status, statusText) {
  if (typeof detail === 'string' && /^[a-z0-9_:-]+$/i.test(detail)) {
    return detail;
  }
  if (status >= 500) {
    return 'request_failed';
  }
  if (typeof statusText === 'string' && statusText.trim()) {
    return statusText.trim().toLowerCase().replace(/\s+/g, '_');
  }
  return 'request_failed';
}

export function resolveApiKey() {
  return (window.__ADMIN_API_KEY__ || '').trim();
}

export async function requestJson(path, options = {}) {
  const apiKey = resolveApiKey();
  const headers = new Headers(options.headers || {});
  if (apiKey) {
    headers.set('x-api-key', apiKey);
  }

  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.detail || payload?.error;
    throw new Error(sanitizeErrorDetail(detail, response.status, response.statusText));
  }
  return payload;
}
