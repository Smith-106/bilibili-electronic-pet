import { requestJson } from './api-client'

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export interface Job {
  id: string
  status: string
  comment_text: string | null
  route_context: Record<string, unknown>
  reply_text?: string | null
  risk_flags: string[]
  created_at: string | null
}

export interface MemorySpace {
  id: number
  space_key: string
  space_type: string
  title: string
  summary?: string
  updated_at: string | null
}

export interface MemoryItem {
  id: number
  space_id: number
  item_key: string
  content_type: string
  source: string
  content: string | null
  updated_at: string | null
}

export function createAdminApi() {
  return {
    getOverview() {
      return requestJson('/api/admin/overview')
    },
    getMetricsOverview() {
      return requestJson('/api/admin/metrics/overview')
    },
    getPetOverview() {
      return requestJson('/api/admin/pet/overview')
    },
    recordPetAction(action: string, note: string) {
      return requestJson('/api/admin/pet/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      })
    },
    getPlatformConnections() {
      return requestJson('/api/admin/platforms')
    },
    setPlatformConnectionControl(platform: string, enabled: boolean) {
      return requestJson(`/api/admin/platforms/${encodeURIComponent(platform)}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
    },
    getObservabilitySummary({ windowMinutes, window_minutes }: { windowMinutes?: number; window_minutes?: number } = {}) {
      return requestJson(`/api/admin/observability/summary${qs({ window_minutes: windowMinutes ?? window_minutes })}`)
    },
    getJobs({ status, limit }: { status?: string; limit?: number } = {}) {
      return requestJson<{ items: Job[] }>(`/api/admin/jobs${qs({ status, limit })}`)
    },
    getJob(jobId: string) {
      return requestJson(`/api/jobs/${encodeURIComponent(jobId)}`)
    },
    approveJob(jobId: string) {
      return requestJson(`/api/jobs/${encodeURIComponent(jobId)}/approve`, { method: 'POST' })
    },
    retryJob(jobId: string, body = {}) {
      return requestJson(`/api/jobs/${encodeURIComponent(jobId)}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    },
    deleteJob(jobId: string) {
      return requestJson(`/api/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' })
    },
    exportJobs(filters = {}) {
      return requestJson<Blob>('/api/admin/jobs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      })
    },
    getGatewayLogs({ limit }: { limit?: number } = {}) {
      return requestJson(`/api/admin/gateway/logs${qs({ limit })}`)
    },
    resetGatewayCounter() {
      return requestJson('/api/admin/gateway/reset', { method: 'POST' })
    },
    getAuditSummary({ days }: { days?: number } = {}) {
      return requestJson(`/api/admin/audit/summary${qs({ days })}`)
    },
    listAuditLogs({ page, size }: { page?: number; size?: number } = {}) {
      return requestJson(`/api/admin/audit/logs${qs({ page, size })}`)
    },
    downloadAuditLog({ days }: { days?: number } = {}) {
      return requestJson<Blob>(`/api/admin/audit/download${qs({ days })}`, { method: 'GET' })
    },
    getBilibiliSettings() {
      return requestJson('/api/admin/pet/bilibili/settings')
    },
    saveBilibiliSettings(settings: unknown) {
      return requestJson('/api/admin/pet/bilibili/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
    },
    getMemorySpaces() {
      return requestJson<{ items: MemorySpace[] }>('/api/admin/memory/spaces')
    },
    getMemorySpaceItems(spaceId: number) {
      return requestJson<{ items: MemoryItem[] }>(`/api/admin/memory/spaces/${encodeURIComponent(spaceId)}/items`)
    },
    createMemorySpace(data: { space_key: string; space_type: string; title: string; summary?: string }) {
      return requestJson('/api/admin/memory/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    upsertMemoryItem(data: { space_id: number; item_key: string; content: string; content_type: string; source: string }) {
      return requestJson('/api/admin/memory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    deleteMemoryItem(spaceId: number, itemId: number) {
      return requestJson(`/api/admin/memory/items/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      })
    },
  }
}
