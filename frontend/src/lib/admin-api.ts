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

export interface BilibiliVideo {
  id: number
  bvid: string
  title: string
  enabled: boolean
  last_polled_at: string | null
}

export interface BilibiliCredential {
  id: number
  name: string
  active: boolean
  created_at: string | null
}

export interface RoleCard {
  id: number
  name: string
  description: string
  tone: string
  active: boolean
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
    // Bilibili APIs
    getBilibiliStatus() {
      return requestJson('/api/admin/bilibili/status')
    },
    getBilibiliVideos() {
      return requestJson<{ items: BilibiliVideo[] }>('/api/admin/bilibili/videos')
    },
    getBilibiliCredentials() {
      return requestJson<{ items: BilibiliCredential[] }>('/api/admin/bilibili/credentials')
    },
    addBilibiliVideo(data: { bvid: string; title?: string }) {
      return requestJson('/api/admin/bilibili/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    toggleBilibiliVideoPoll(videoId: number, enabled: boolean) {
      return requestJson(`/api/admin/bilibili/videos/${videoId}/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
    },
    syncBilibiliVideo(videoId: number) {
      return requestJson(`/api/admin/bilibili/videos/${videoId}/sync`, { method: 'POST' })
    },
    deleteBilibiliVideo(videoId: number) {
      return requestJson(`/api/admin/bilibili/videos/${videoId}`, { method: 'DELETE' })
    },
    triggerBilibiliPoll() {
      return requestJson('/api/admin/bilibili/poll', { method: 'POST' })
    },
    addBilibiliCredential(data: { name: string; cookie: string }) {
      return requestJson('/api/admin/bilibili/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    activateBilibiliCredential(credentialId: number) {
      return requestJson(`/api/admin/bilibili/credentials/${credentialId}/activate`, { method: 'POST' })
    },
    deleteBilibiliCredential(credentialId: number) {
      return requestJson(`/api/admin/bilibili/credentials/${credentialId}`, { method: 'DELETE' })
    },
    // Role Cards APIs
    getRoleCards() {
      return requestJson<{ items: RoleCard[] }>('/api/admin/role-cards')
    },
    createRoleCard(data: { name: string; description: string; tone: string }) {
      return requestJson('/api/admin/role-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    updateRoleCard(cardId: number, data: { name?: string; description?: string; tone?: string }) {
      return requestJson(`/api/admin/role-cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    activateRoleCard(cardId: number) {
      return requestJson(`/api/admin/role-cards/${cardId}/activate`, { method: 'POST' })
    },
    disableRoleCard(cardId: number) {
      return requestJson(`/api/admin/role-cards/${cardId}/disable`, { method: 'POST' })
    },
    // Jobs batch operations
    batchApprove(jobIds: string[]) {
      return requestJson('/api/admin/jobs/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_ids: jobIds }),
      })
    },
    batchRetry(jobIds: string[]) {
      return requestJson('/api/admin/jobs/batch-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_ids: jobIds }),
      })
    },
    exportJobsCsv(filters = {}) {
      return requestJson<Blob>('/api/admin/jobs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      })
    },
    // Readiness
    getReadinessStatus() {
      return requestJson('/readiness')
    },
  }
}
