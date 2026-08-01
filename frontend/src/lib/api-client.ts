import { getSessionToken, getApiKey } from '@/components/providers/auth-provider'

function sanitizeErrorDetail(
  detail: unknown,
  status: number,
  statusText: string,
): string {
  if (typeof detail === 'string' && /^[a-z0-9_:-]+$/i.test(detail)) {
    return detail
  }
  if (status >= 500) {
    return 'request_failed'
  }
  if (typeof statusText === 'string' && statusText.trim()) {
    return statusText.trim().toLowerCase().replace(/\s+/g, '_')
  }
  return 'request_failed'
}

export async function requestJson<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const sessionToken = getSessionToken()
  const apiKeyVal = getApiKey()
  const headers = new Headers(options.headers)
  if (sessionToken) {
    headers.set('x-admin-session', sessionToken)
  }
  if (apiKeyVal) {
    headers.set('x-api-key', apiKeyVal)
  }

  const response = await fetch(path, { ...options, headers })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail =
      (payload as Record<string, unknown>)?.detail ||
      (payload as Record<string, unknown>)?.error
    throw new Error(sanitizeErrorDetail(detail, response.status, response.statusText))
  }
  return payload as T
}

export async function downloadFile(path: string, filename: string) {
  const sessionToken = getSessionToken()
  const apiKeyVal = getApiKey()
  const headers = new Headers()
  if (sessionToken) {
    headers.set('x-admin-session', sessionToken)
  }
  if (apiKeyVal) {
    headers.set('x-api-key', apiKeyVal)
  }
  const response = await fetch(path, { headers })
  if (!response.ok) {
    throw new Error('download_failed')
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
