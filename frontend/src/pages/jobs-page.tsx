import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createAdminApi, type Job } from '@/lib/admin-api'
import { formatRouteContextLabel } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'
import { Timestamp } from '@/components/timestamp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { RefreshCw, Download, CheckSquare, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

const api = createAdminApi()

export function JobsPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [limit, setLimit] = useState(20)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['jobs', { status, limit }],
    queryFn: () => api.getJobs({ status: status || undefined, limit }),
  })

  const approveMutation = useMutation({
    mutationFn: (jobId: string) => api.approveJob(jobId),
    onSuccess: () => {
      toast.success('审批成功')
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (err: Error) => toast.error(`审批失败: ${err.message}`),
  })

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => api.retryJob(jobId),
    onSuccess: () => {
      toast.success('重试已提交')
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (err: Error) => toast.error(`重试失败: ${err.message}`),
  })

  const batchApproveMutation = useMutation({
    mutationFn: (ids: string[]) => api.batchApprove(ids),
    onSuccess: (_, ids) => {
      toast.success(`批量审批 ${ids.length} 项成功`)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (err: Error) => toast.error(`批量审批失败: ${err.message}`),
  })

  const batchRetryMutation = useMutation({
    mutationFn: (ids: string[]) => api.batchRetry(ids),
    onSuccess: (_, ids) => {
      toast.success(`批量重试 ${ids.length} 项成功`)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (err: Error) => toast.error(`批量重试失败: ${err.message}`),
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

  function toggleSelectAll() {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(j => j.id)))
    }
  }

  async function handleExport() {
    try {
      await api.exportJobsCsv({ status: status || undefined, limit })
      toast.success('导出成功')
    } catch (err) {
      toast.error(`导出失败: ${(err as Error).message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">任务管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> 刷新
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> 导出 CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label>状态</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="全部" /></SelectTrigger>
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
          <Label>数量</Label>
          <Input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="w-20" min={1} max={200} />
        </div>
        <Button onClick={() => refetch()}>查询</Button>
      </div>

      {/* Batch bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm">已选 {selectedIds.size} 项</span>
          <Button size="sm" variant="secondary" onClick={() => batchApproveMutation.mutate([...selectedIds])}>
            <CheckSquare className="mr-1 h-3 w-3" /> 批量审批
          </Button>
          <Button size="sm" variant="secondary" onClick={() => batchRetryMutation.mutate([...selectedIds])}>
            <RotateCcw className="mr-1 h-3 w-3" /> 批量重试
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">暂无任务</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input type="checkbox" checked={selectedIds.size === items.length && items.length > 0} onChange={toggleSelectAll} />
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
                  <input type="checkbox" checked={selectedIds.has(j.id)} onChange={() => toggleSelect(j.id)} />
                </TableCell>
                <TableCell className="font-mono text-xs" title={j.id}>
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
                        <span key={i} className="inline-block rounded bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-xs text-red-700 dark:text-red-400">{f}</span>
                      ))}
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell><Timestamp value={j.created_at} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {j.status === 'pending_review' && (
                      <Button size="sm" onClick={() => approveMutation.mutate(j.id)} disabled={approveMutation.isPending}>审批</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => retryMutation.mutate(j.id)} disabled={retryMutation.isPending}>重试</Button>
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
