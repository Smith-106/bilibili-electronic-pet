import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Escape HTML special characters to prevent XSS in user-generated content.
 * Preserved from original frontend (spec S-20260712-7mhr: innerHTML MUST escapeHtml).
 */
export function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export function safeCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (Array.isArray(value)) return value.length
  return 0
}

export function safeCountStr(value: unknown): string {
  if (value == null) return '0'
  const n = Number(value)
  return isNaN(n) ? '0' : String(n)
}

export function formatIsoDateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return String(iso)
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return String(iso)
  }
}

export function timeAgo(isoString: string | null | undefined): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ''
    const diff = Date.now() - d.getTime()
    const sec = Math.floor(diff / 1000)
    if (sec < 60) return '刚刚'
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}分钟前`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}小时前`
    const day = Math.floor(hr / 24)
    if (day < 30) return `${day}天前`
    const month = Math.floor(day / 30)
    if (month < 12) return `${month}个月前`
    return `${Math.floor(month / 12)}年前`
  } catch {
    return ''
  }
}

export function getErrorText(error: unknown, fallback = '操作失败'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function formatRouteContextLabel(routeContext: Record<string, unknown> | null | undefined): string {
  if (!routeContext || typeof routeContext !== 'object') return '-'

  const platform = typeof routeContext.platform === 'string' ? routeContext.platform.trim().toLowerCase() : ''
  const containerId = typeof routeContext.container_id === 'string' ? routeContext.container_id.trim() : ''
  const userId = typeof routeContext.user_id === 'string' ? routeContext.user_id.trim() : ''
  const parentExternalId = typeof routeContext.parent_external_id === 'string' ? routeContext.parent_external_id.trim() : ''
  const chatType = typeof routeContext.chat_type === 'string' ? routeContext.chat_type.trim().toLowerCase() : ''

  const parts: string[] = []
  if (platform === 'qq') {
    if (chatType === 'group' && containerId) parts.push(`QQ群 ${containerId}`)
    else if (chatType === 'private' && userId) parts.push(`QQ私聊 ${userId}`)
    else if (containerId) parts.push(`QQ容器 ${containerId}`)
  } else if (containerId) {
    parts.push(`容器 ${containerId}`)
  }

  if (!parts.length && userId) {
    parts.push(`用户 ${userId}`)
  } else if (parts.length && userId && !(platform === 'qq' && chatType === 'private')) {
    parts.push(`用户 ${userId}`)
  }

  if (parentExternalId) parts.push(`回复 ${parentExternalId}`)

  return parts.length ? parts.join(' / ') : '-'
}
