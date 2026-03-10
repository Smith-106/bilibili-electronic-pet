export function resolveApiKey() {
  const fromGlobal = (window.__ADMIN_API_KEY__ || '').trim();
  if (fromGlobal) return fromGlobal;
  const params = new URLSearchParams(window.location.search);
  return (params.get('api_key') || '').trim();
}

export async function requestJson(path, options = {}) {
  const apiKey = resolveApiKey();
  const headers = new Headers(options.headers || {});
  if (apiKey) {
    headers.set('x-api-key', apiKey);
  }

  let url = path;
  if (!apiKey) {
    const params = new URLSearchParams(window.location.search);
    const queryKey = (params.get('api_key') || '').trim();
    if (queryKey) {
      const sep = path.includes('?') ? '&' : '?';
      url = `${path}${sep}api_key=${encodeURIComponent(queryKey)}`;
    }
  }

  const response = await fetch(url, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.detail || payload?.error || response.statusText || 'request_failed';
    throw new Error(String(detail));
  }
  return payload;
}
