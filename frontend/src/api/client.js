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

export function resolveAdminSessionToken() {
  return (window.__ADMIN_SESSION_TOKEN__ || '').trim();
}

export async function requestJson(path, options = {}) {
  const sessionToken = resolveAdminSessionToken();
  const apiKey = resolveApiKey();
  const headers = new Headers(options.headers || {});
  if (sessionToken) {
    headers.set('x-admin-session', sessionToken);
  }
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

export async function downloadFile(path, filename) {
  const sessionToken = resolveAdminSessionToken();
  const apiKey = resolveApiKey();
  const headers = new Headers();
  if (sessionToken) {
    headers.set('x-admin-session', sessionToken);
  }
  if (apiKey) {
    headers.set('x-api-key', apiKey);
  }
  const response = await fetch(path, { headers });
  if (!response.ok) {
    throw new Error('download_failed');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
