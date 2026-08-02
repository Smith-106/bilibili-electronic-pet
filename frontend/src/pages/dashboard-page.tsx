import { useState } from 'react'
import { createAdminApi } from '@/lib/admin-api'
import { safeCount, formatIsoDateTime, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'

const api = createAdminApi()

const RUNTIME_SIGNAL_SPECS = [
  { label: 'LLM 提供方', keys: ['llm_provider', 'llmProvider'] },
  { label: '搜索提供方', keys: ['search_provider', 'searchProvider'] },
  { label: '发布模式', keys: ['publisher_mode', 'publisherMode'] },
  { label: 'LLM Key', keys: ['llm_api_key_configured', 'llmApiKeyConfigured'], format: 'configured' },
  { label: '搜索 Key', keys: ['search_api_key_configured', 'searchApiKeyConfigured'], format: 'configured' },
  { label: 'Webhook', keys: ['publisher_webhook_url_configured', 'publisherWebhookUrlConfigured'], format: 'configured' },
  { label: 'B 站采集', keys: ['bilibili_enabled', 'bilibiliEnabled'], format: 'enabled' },
  { label: 'B 站发布', keys: ['bilibili_publish_enabled', 'bilibiliPublishEnabled'], format: 'enabled' },
  { label: 'Kill Switch', keys: ['kill_switch', 'killSwitch'], format: 'enabled' },
]

const READINESS_SIGNAL_SPECS = [
  { label: '基础就绪', keys: ['foundation_ready'], format: 'ready' },
  { label: '交付就绪', keys: ['delivery_ready'], format: 'ready' },
  { label: '基础阻塞', keys: ['foundation_blockers'], format: 'count' },
  { label: '交付阻塞', keys: ['delivery_blockers'], format: 'count' },
  { label: '能力阻塞', keys: ['delivery_capability_blockers'], format: 'count' },
]

function getFirstValue(record, keys) {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== '') {
      return record[key]
    }
  }
  return undefined
}

function formatSignalValue(value, format) {
  if (format === 'configured') {
    return value ? '已配置' : '未配置'
  }
  if (format === 'enabled') {
    return value ? '开启' : '关闭'
  }
  if (format === 'ready') {
    return value ? '就绪' : '阻塞'
  }
  if (format === 'count') {
    return Array.isArray(value) ? `${value.length}项` : String(value ?? '0')
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }
  return String(value)
}

function buildRuntimeSignals(metricsOverview) {
  return RUNTIME_SIGNAL_SPECS
    .map((spec) => {
      const value = getFirstValue(metricsOverview, spec.keys)
      if (value === undefined) {
        return null
      }
      return {
        label: spec.label,
        value: formatSignalValue(value, spec.format),
      }
    })
    .filter(Boolean)
}

function resolveEffectivePublishMode(readiness) {
  const mode = readiness?.bilibili_diagnostics?.effective_publish_mode
    ?? readiness?.delivery_signals?.effective_publish_mode
    ?? readiness?.effective_publish_mode
  return typeof mode === 'string' && mode.trim() ? mode.trim() : ''
}

function buildReadinessSignals(readiness) {
  if (!readiness || typeof readiness !== 'object' || Array.isArray(readiness)) {
    return []
  }

  const entries = READINESS_SIGNAL_SPECS
    .map((spec) => {
      const value = getFirstValue(readiness, spec.keys)
      if (value === undefined) {
        return null
      }
      return {
        label: spec.label,
        value: formatSignalValue(value, spec.format),
      }
    })
    .filter(Boolean)

  const effectivePublishMode = resolveEffectivePublishMode(readiness)
  if (effectivePublishMode) {
    entries.unshift({
      label: '发布模式',
      value: effectivePublishMode,
    })
  }

  return entries
}

function humanizeKey(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function flattenObservabilityEntries(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }
  const entries = []
  for (const [key, raw] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key
    if (raw == null || raw === '') {
      continue
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      entries.push(...flattenObservabilityEntries(raw, nextKey))
      continue
    }
    if (Array.isArray(raw)) {
      if (raw.length > 0) {
        entries.push({ label: humanizeKey(nextKey), value: `${raw.length}项` })
      }
      continue
    }
    entries.push({ label: humanizeKey(nextKey), value: String(raw) })
  }
  return entries
}

interface JobItem {
  id: string
  status: string
  comment_text: string
  created_at: string | null
}

export function DashboardPage() {
  const [refreshing, setRefreshing] = useState(false)

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.getOverview().catch(() => null),
  })

  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs', { limit: 5 }],
    queryFn: () => api.getJobs({ limit: 5 }).catch(() => null),
  })

  const { data: auditSummary, isLoading: loadingAudit } = useQuery({
    queryKey: ['auditSummary', { days: 7 }],
    queryFn: () => api.getAuditSummary({ days: 7 }).catch(() => null),
  })

  const { data: metricsOverview, isLoading: loadingMetrics } = useQuery({
    queryKey: ['metricsOverview'],
    queryFn: () => api.getMetricsOverview().catch(() => null),
  })

  const { data: observabilitySummary, isLoading: loadingObs } = useQuery({
    queryKey: ['observabilitySummary', { windowMinutes: 120 }],
    queryFn: () => api.getObservabilitySummary({ windowMinutes: 120 }).catch(() => null),
  })

  const { data: readinessStatus, isLoading: loadingReady } = useQuery({
    queryKey: ['readinessStatus'],
    queryFn: () => api.getReadinessStatus().catch(() => null),
  })

  const gwItems = jobs?.gateway_logs || []

  const runtimeSignals = (() => {
    const metricsSignals = buildRuntimeSignals(metricsOverview || {})
    return metricsSignals.length > 0 ? metricsSignals : buildReadinessSignals(readinessStatus || {})
  })()

  const observabilitySignals = flattenObservabilityEntries(observabilitySummary?.summary || observabilitySummary || {}).slice(0, 6)
  const observabilityEmptyText = observabilitySummary?.ok ? '当前窗口暂无可观测数据' : '未返回可观测性摘要'

  async function handleRefresh() {
    setRefreshing(true)
    // INT-001: refresh 期间 disabled 防重复点击
    try {
      // Invalidate queries and refetch
      await Promise.all([
        api.getOverview(),
        api.getJobs({ limit: 5 }),
        api.getAuditSummary({ days: 7 }),
        api.getMetricsOverview(),
        api.getObservabilitySummary({ windowMinutes: 120 }),
        api.getReadinessStatus(),
      ])
    } finally {
      setTimeout(() => setRefreshing(false), 300) // brief delay for UX
    }
  }

  const ov = overview || {}
  const jobItems: JobItem[] = Array.isArray(jobs?.items) ? jobs.items : []

  const stats = [
    { label: '评论总数', value: safeCount(ov.total_comments) },
    { label: '任务总数', value: safeCount(ov.total_jobs) },
    { label: '已发布', value: safeCount(ov.total_published) },
    { label: '人工队列', value: safeCount(ov.pending_review) },
    { label: '失败数', value: safeCount(ov.total_failed) },
    { label: '网关事件', value: safeCount(gwItems.length) },
  ]

  if (loadingOverview || loadingJobs || loadingAudit || loadingMetrics || loadingObs || loadingReady) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[40px] w-full" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
        <Skeleton className="h-[200px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">系统概览</h1>
        <Button onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? '刷新中...' : '刷新'}
        </Button>
      </div>

      {/* Stats Grid — featured first tile breaks the equal-weight grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={cn(
              'rounded-lg border bg-card p-4 shadow-xs',
              i === 0 && 'col-span-2',
            )}
          >
            <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
            <div className={cn('mt-2 font-semibold', i === 0 ? 'text-3xl' : 'text-2xl')}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Section Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Jobs */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="border-b px-6 py-4 font-semibold">最近任务</div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">状态</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">评论摘要</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {jobItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      暂无任务。新评论进入流水线后会显示在这里。
                    </td>
                  </tr>
                ) : (
                  jobItems.map((j) => (
                    <tr key={j.id} className="hover:bg-accent/50">
                      <td className="px-4 py-3 text-sm" title={String(j.id)}>
                        {String(j.id).substring(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={j.status === 'approved' ? 'default' : j.status === 'failed' ? 'destructive' : 'secondary'}>
                          {j.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate" title={j.comment_text}>
                        {j.comment_text?.substring(0, 60)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatIsoDateTime(j.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Summary */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="border-b px-6 py-4 font-semibold">审计摘要 (7 天)</div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center rounded-md bg-muted/50 p-4">
                <div className="text-sm text-muted-foreground">总操作</div>
                <div className="mt-2 text-xl font-semibold">{safeCount(auditSummary?.total)}</div>
              </div>
              <div className="text-center rounded-md bg-muted/50 p-4">
                <div className="text-sm text-muted-foreground">成功</div>
                <div className="mt-2 text-xl font-semibold text-success">{safeCount(auditSummary?.ok_count)}</div>
              </div>
              <div className="text-center rounded-md bg-muted/50 p-4">
                <div className="text-sm text-muted-foreground">失败</div>
                <div className="mt-2 text-xl font-semibold text-destructive">{safeCount(auditSummary?.failed_count)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Runtime Signals */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="border-b px-6 py-4 font-semibold">运行时能力</div>
          <div className="p-6">
            {runtimeSignals.length === 0 ? (
              <div className="text-sm text-muted-foreground">未返回运行时配置摘要</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {runtimeSignals.map((signal) => (
                  <div key={signal.label} className="rounded-md bg-muted/50 p-4">
                    <div className="text-sm text-muted-foreground">{signal.label}</div>
                    <div className="mt-1 text-base font-medium">{signal.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Observability Summary */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="border-b px-6 py-4 font-semibold">可观测性摘要 (120 分钟)</div>
          <div className="p-6">
            {observabilitySignals.length === 0 ? (
              <div className="text-sm text-muted-foreground">{observabilityEmptyText}</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {observabilitySignals.map((signal, idx) => (
                  <div key={idx} className="rounded-md bg-muted/50 p-4">
                    <div className="text-sm text-muted-foreground">{signal.label}</div>
                    <div className="mt-1 text-base font-medium">{signal.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
