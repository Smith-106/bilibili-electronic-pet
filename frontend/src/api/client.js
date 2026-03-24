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
    const detail = payload?.detail || payload?.error || response.statusText || 'request_failed';
    throw new Error(String(detail));
  }
  return payload;
}
