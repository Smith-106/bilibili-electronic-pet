import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createAdminApi, type Job } from '@/lib/admin-api'
import { formatRouteContextLabel } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'
import { Timestamp } from '@/components/timestamp'
import { EmptyState } from '@/components/empty-state'
import { TableSkeleton } from '@/components/table-skeleton'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { RefreshCw, Download, CheckSquare, RotateCcw, Loader2, ListTodo } from 'lucide-react'
import { toast } from 'sonner'
import { toastMutationError } from '@/lib/feedback'

const api = createAdminApi()

export function JobsPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [limit, setLimit] = useState(20)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['jobs', { status, limit }],
    // H-02: 查询边界哨兵值归一化 — "__all__"/空串 → undefined，禁止泄漏到 API 参数
    queryFn: () => api.getJobs({
      status: !status || status === '__all__' ? undefined : status,
      limit,
    }),
  })

  const approveMutation = useMutation({
    mutationFn: (jobId: string) => api.approveJob(jobId),
    onSuccess: () => {
      toast.success('审批成功')
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (err: Error, jobId: string) =>
      toastMutationError(`审批失败：${err.message}。请确认任务仍处于待审核状态后重试`, {
        retry: () => approveMutation.mutate(jobId),
      }),
  })

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => api.retryJob(jobId),
    onSuccess: () => {
      toast.success('重试已提交')
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (err: Error, jobId: string) =>
      toastMutationError(`重试失败：${err.message}。请稍后再次重试，或检查上游服务状态`, {
        retry: () => retryMutation.mutate(jobId),
      }),
  })

  const batchApproveMutation = useMutation({
    mutationFn: (ids: string[]) => api.batchApprove(ids),
    onSuccess: (_, ids) => {
      toast.success(`批量审批 ${ids.length} 项成功`)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (err: Error, ids: string[]) =>
      toastMutationError(`批量审批失败：${err.message}。请刷新列表确认任务状态后重试`, {
        retry: () => batchApproveMutation.mutate(ids),
      }),
  })

  const batchRetryMutation = useMutation({
    mutationFn: (ids: string[]) => api.batchRetry(ids),
    onSuccess: (_, ids) => {
      toast.success(`批量重试 ${ids.length} 项成功`)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (err: Error, ids: string[]) =>
      toastMutationError(`批量重试失败：${err.message}。请稍后再次重试`, {
        retry: () => batchRetryMutation.mutate(ids),
      }),
  })

  const items = (data?.items ?? []) as Job[]

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleExport() {
    try {
      // H-02: 导出与 queryFn 同一归一化约定，防止哨兵值泄漏到导出请求
      await api.exportJobsCsv({
        status: !status || status === '__all__' ? undefined : status,
        limit,
      })
      toast.success('导出成功')
    } catch (err) {
      toastMutationError(`导出失败：${(err as Error).message}。请检查筛选条件后重试`, {
        retry: handleExport,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">任务管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> 刷新列表
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" /> 导出 CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="job-status-filter">状态</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="job-status-filter" className="w-40"><SelectValue placeholder="全部" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              <SelectItem value="queued">排队中</SelectItem>
              <SelectItem value="pending_review">待审核</SelectItem>
              <SelectItem value="approved">已审批</SelectItem>
              <SelectItem value="published">已发布</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
              <SelectItem value="skipped">已跳过</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="job-limit">数量</Label>
          <Input id="job-limit" type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="w-20" min={1} max={200} />
        </div>
        {/* L-12: 移除冗余"查询任务"按钮 — Select/Input 变更已自动更新 queryKey 触发 refetch */}
      </div>

      {/* Batch bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm">已选 {selectedIds.size} 项</span>
          <Button size="sm" variant="secondary" onClick={() => batchApproveMutation.mutate([...selectedIds])} disabled={batchApproveMutation.isPending} aria-busy={batchApproveMutation.isPending}>
            {batchApproveMutation.isPending
              ? <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
              : <CheckSquare className="mr-1 h-3 w-3" aria-hidden="true" />}
            {batchApproveMutation.isPending ? '审批中...' : '批量审批'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => batchRetryMutation.mutate([...selectedIds])} disabled={batchRetryMutation.isPending} aria-busy={batchRetryMutation.isPending}>
            {batchRetryMutation.isPending
              ? <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
              : <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />}
            {batchRetryMutation.isPending ? '重试中...' : '批量重试'}
          </Button>
          {/* M-05: 清除选择出口 */}
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            清除选择
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={5} columns={8} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="暂无任务"
          description="任务由评论流水线自动生成。确认 B 站视频已启用轮询，新评论进入后将自动创建任务。"
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setStatus(''); setLimit(20) }}>
                重置筛选条件
              </Button>
            </div>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                {/* 44px hit area via wrapping div (Round-2 RC-2); L-03: Radix Checkbox + indeterminate */}
                <div className="flex size-11 items-center justify-center">
                  <Checkbox
                    aria-label="全选当前页任务"
                    checked={selectedIds.size === items.length && items.length > 0 ? true : selectedIds.size > 0 ? 'indeterminate' : false}
                    onCheckedChange={(checked) => {
                      if (checked === false) setSelectedIds(new Set())
                      else setSelectedIds(new Set(items.map(j => j.id)))
                    }}
                  />
                </div>
              </TableHead>
              <TableHead>ID</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>评论内容</TableHead>
              <TableHead>路由</TableHead>
              <TableHead>回复</TableHead>
              <TableHead>风险</TableHead>
              <TableHead>时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((j: Job) => (
              <TableRow key={j.id}>
                <TableCell>
                  <div className="flex size-11 items-center justify-center">
                    <Checkbox
                      aria-label={`选择任务 ${String(j.id).substring(0, 8)}`}
                      checked={selectedIds.has(j.id)}
                      onCheckedChange={() => toggleSelect(j.id)}
                    />
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm md:text-xs" title={j.id}>
                  {String(j.id).substring(0, 8)}
                </TableCell>
                <TableCell><StatusBadge status={j.status} /></TableCell>
                <TableCell className="max-w-[200px] truncate" title={j.comment_text}>
                  {(j.comment_text || '').substring(0, 80)}
                </TableCell>
                <TableCell className="max-w-[150px] truncate" title={formatRouteContextLabel(j.route_context)}>
                  {formatRouteContextLabel(j.route_context)}
                </TableCell>
                <TableCell className="max-w-[150px] truncate" title={j.reply_text}>
                  {(j.reply_text || '').substring(0, 60)}
                </TableCell>
                <TableCell>
                  {j.risk_flags?.length ? (
                    <div className="flex gap-1 flex-wrap">
                      {j.risk_flags.map((f, i) => (
                        <span key={i} className="inline-block rounded bg-risk-flag-bg px-1.5 py-0.5 text-sm text-risk-flag-fg md:text-xs">{f}</span>
                      ))}
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell><Timestamp value={j.created_at} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {j.status === 'pending_review' && (
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(j.id)}
                        disabled={approveMutation.isPending}
                        aria-busy={approveMutation.isPending && approveMutation.variables === j.id}
                      >
                        {approveMutation.isPending && approveMutation.variables === j.id && <Loader2 className="animate-spin" aria-hidden="true" />}
                        {approveMutation.isPending && approveMutation.variables === j.id ? '审批中...' : '审批任务'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryMutation.mutate(j.id)}
                      disabled={retryMutation.isPending}
                      aria-busy={retryMutation.isPending && retryMutation.variables === j.id}
                    >
                      {retryMutation.isPending && retryMutation.variables === j.id && <Loader2 className="animate-spin" aria-hidden="true" />}
                      {retryMutation.isPending && retryMutation.variables === j.id ? '重试中...' : '重试任务'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
