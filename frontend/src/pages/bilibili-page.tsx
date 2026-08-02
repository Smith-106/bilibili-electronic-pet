import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createAdminApi, type BilibiliVideo, type BilibiliCredential } from '@/lib/admin-api'
import { StatCard } from '@/components/stat-card'
import { BoolBadge } from '@/components/status-badge'
import { Timestamp } from '@/components/timestamp'
import { TableSkeleton } from '@/components/table-skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { RefreshCw, Plus, Trash2, RotateCw, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { toastMutationError } from '@/lib/feedback'

const api = createAdminApi()
const PAGE_SIZE = 10

// --- Helpers ---
function fmtToggle(val: unknown, on: string, off: string): string {
  return val ? on : off
}
function fmtDuration(sec: unknown): string {
  if (sec == null) return '-'
  const n = Number(sec)
  if (isNaN(n)) return String(sec)
  if (n < 60) return `${n}秒`
  if (n < 3600) return `${Math.floor(n / 60)}分钟`
  return `${(n / 3600).toFixed(1)}小时`
}

/* Semantic colors come from theme tokens (all 3 themes), not hardcoded palette */
function resolveCredentialExpiry(expiresAt?: string): { label: string; color: string } {
  if (!expiresAt) return { label: '未设置', color: 'text-muted-foreground' }
  const d = new Date(expiresAt)
  if (isNaN(d.getTime())) return { label: '无效', color: 'text-destructive' }
  const diff = d.getTime() - Date.now()
  if (diff < 0) return { label: '已过期', color: 'text-destructive' }
  if (diff < 7 * 86400000) return { label: '即将过期', color: 'text-warning' }
  return { label: '有效期内', color: 'text-success' }
}

function fingerprint(cred: BilibiliCredential): string {
  const id = cred.credential_id || cred.id || '-'
  return String(id).substring(0, 12)
}

export function BilibiliPage() {
  const queryClient = useQueryClient()
  const [videoOffset, setVideoOffset] = useState(0)
  const [pollFilter, setPollFilter] = useState('')

  // Video form
  const [bvid, setBvid] = useState('')
  // Credential form
  const [credName, setCredName] = useState('')
  const [sessdata, setSessdata] = useState('')
  const [biliJct, setBiliJct] = useState('')
  const [buvid3, setBuvid3] = useState('')
  const [buvid4, setBuvid4] = useState('')
  const [credExpires, setCredExpires] = useState('')
  const [showCredValues, setShowCredValues] = useState(false)
  const credInputType = showCredValues ? 'text' : 'password'
  // Credential filters
  const [credActiveFilter, setCredActiveFilter] = useState('')
  const [credExpiryFilter, setCredExpiryFilter] = useState('')
  // Destructive confirm dialog (replaces native confirm())
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'video' | 'credential'; id: string } | null>(null)
  // Refs for empty-state action buttons (focus the relevant form field)
  const bvidInputRef = useRef<HTMLInputElement>(null)
  const credNameInputRef = useRef<HTMLInputElement>(null)

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ['bili-status', 'bili-videos', 'bili-creds'] })

  // --- Queries ---
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['bili-status'],
    queryFn: () => api.getBilibiliStatus(),
  })
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['bili-videos', { offset: videoOffset, pollFilter }],
    queryFn: () => api.getBilibiliVideos({
      limit: PAGE_SIZE,
      offset: videoOffset,
      // H-02: 查询边界哨兵值归一化 — 修复选"全部状态"时错误下发 poll_enabled=false
      poll_enabled: !pollFilter || pollFilter === '__all__' ? undefined : pollFilter === 'true',
    }),
  })
  const { data: credsData, isLoading: credsLoading } = useQuery({
    queryKey: ['bili-creds'],
    queryFn: () => api.getBilibiliCredentials(),
  })

  // --- Mutations ---
  const addVideoMutation = useMutation({
    mutationFn: () => api.addBilibiliVideo(bvid),
    onSuccess: () => { toast.success('添加成功'); setBvid(''); invalidateAll() },
    onError: (err: Error) => toastMutationError(`添加失败：${err.message}。请检查 BVID 格式是否正确（例：BV1xx411c7mD）后重试`),
  })
  const togglePollMutation = useMutation({
    mutationFn: (videoId: string) => api.toggleBilibiliVideoPoll(videoId),
    onSuccess: () => { toast.success('操作成功'); invalidateAll() },
    onError: (err: Error, videoId: string) =>
      toastMutationError(`失败: ${err.message}`, {
        retry: () => togglePollMutation.mutate(videoId),
      }),
  })
  const syncVideoMutation = useMutation({
    mutationFn: (videoId: string) => api.syncBilibiliVideo(videoId),
    onSuccess: () => { toast.success('同步成功'); invalidateAll() },
    onError: (err: Error, videoId: string) =>
      toastMutationError(`同步失败: ${err.message}`, {
        retry: () => syncVideoMutation.mutate(videoId),
      }),
  })
  const deleteVideoMutation = useMutation({
    mutationFn: (videoId: string) => api.deleteBilibiliVideo(videoId),
    onSuccess: () => { toast.success('已删除'); invalidateAll() },
    onError: (err: Error) => toastMutationError(`删除失败: ${err.message}`),
  })
  const triggerPollMutation = useMutation({
    mutationFn: () => api.triggerBilibiliPoll(),
    onSuccess: () => { toast.success('轮询已触发'); invalidateAll() },
    onError: (err: Error) =>
      toastMutationError(`轮询失败: ${err.message}`, {
        retry: () => triggerPollMutation.mutate(),
      }),
  })
  const addCredMutation = useMutation({
    mutationFn: () => api.addBilibiliCredential({
      name: credName, sessdata, bili_jct: biliJct, buvid3, buvid4,
      expires_at: credExpires || undefined,
    }),
    onSuccess: () => {
      toast.success('凭证添加成功')
      setCredName(''); setSessdata(''); setBiliJct(''); setBuvid3(''); setBuvid4(''); setCredExpires('')
      invalidateAll()
    },
    onError: (err: Error) => toastMutationError(`凭证添加失败：${err.message}。请检查 SESSDATA 等字段是否完整、未过期`),
  })
  const activateCredMutation = useMutation({
    mutationFn: (id: string) => api.activateBilibiliCredential(id),
    onSuccess: () => { toast.success('已激活'); invalidateAll() },
    onError: (err: Error, id: string) =>
      toastMutationError(`激活失败: ${err.message}`, {
        retry: () => activateCredMutation.mutate(id),
      }),
  })
  const deleteCredMutation = useMutation({
    mutationFn: (id: string) => api.deleteBilibiliCredential(id),
    onSuccess: () => { toast.success('已删除'); invalidateAll() },
    onError: (err: Error) => toastMutationError(`删除失败: ${err.message}`),
  })

  // --- Data ---
  const sd = (statusData as Record<string, unknown>) || {}
  const diag = (sd.diagnostics as Record<string, unknown>) || {}
  const config = (sd.config as Record<string, unknown>) || {}
  const totalVideos = Number(sd.video_count ?? 0)
  const pollEnabledCount = Number((sd.videos as Record<string, unknown>)?.poll_enabled_count ?? 0)
  const videos = (videosData?.items ?? []) as BilibiliVideo[]
  const videosTotal = Number(videosData?.total ?? videos.length)
  const allCreds = (credsData?.items ?? []) as BilibiliCredential[]

  // Filter credentials client-side
  const filteredCreds = allCreds.filter(c => {
    // H-02: 显式归一化 — 哨兵值 __all__ 视为不过滤（原为偶然正确的 fall-through，防回归）
    const activeFilter = !credActiveFilter || credActiveFilter === '__all__' ? undefined : credActiveFilter
    const expiryFilter = !credExpiryFilter || credExpiryFilter === '__all__' ? undefined : credExpiryFilter
    if (activeFilter === 'active' && !(c.is_active || c.active)) return false
    if (activeFilter === 'inactive' && (c.is_active || c.active)) return false
    if (expiryFilter) {
      const exp = resolveCredentialExpiry(c.expires_at)
      if (expiryFilter === 'expired' && exp.label !== '已过期') return false
      if (expiryFilter === 'expiring' && exp.label !== '即将过期') return false
      if (expiryFilter === 'valid' && exp.label !== '有效期内') return false
      if (expiryFilter === 'unset' && exp.label !== '未设置') return false
    }
    return true
  })

  function handleAddVideo() {
    if (!bvid.trim()) { toast.warning('请输入 BVID'); return }
    addVideoMutation.mutate()
  }
  function handleAddCred() {
    if (!credName.trim()) { toast.warning('名称不能为空'); return }
    addCredMutation.mutate()
  }
  function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'video') deleteVideoMutation.mutate(deleteTarget.id)
    else deleteCredMutation.mutate(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">B站集成</h1>
        <Button variant="outline" onClick={() => invalidateAll()}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> 刷新状态
        </Button>
      </div>

      {/* Status cards — 视频数 featured (larger, spans 2) to break equal weight */}
      {statusLoading ? (
        <TableSkeleton rows={2} columns={6} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
          {/* L-08: 文字"是/否" + 语义色替代 emoji，读屏器不再朗读 emoji 名称 */}
          <StatCard label="启用" value={sd.enabled ? '是' : '否'} color={sd.enabled ? 'text-success' : 'text-muted-foreground'} hint={fmtToggle(sd.enabled, '已启用', '已停用')} />
          <StatCard label="轮询" value={sd.polling_enabled ? '是' : '否'} color={sd.polling_enabled ? 'text-success' : 'text-muted-foreground'} hint={fmtToggle(sd.polling_enabled, '自动抓取', '仅手动')} />
          <StatCard label="发布" value={sd.publish_enabled ? '是' : '否'} color={sd.publish_enabled ? 'text-success' : 'text-muted-foreground'} hint={fmtToggle(sd.publish_enabled, '已启用', '已停用')} />
          <StatCard
            label="视频数"
            value={String(totalVideos)}
            hint={`轮询中 ${pollEnabledCount}`}
            className="col-span-2 lg:col-span-2"
            valueClassName="text-3xl"
          />
          <StatCard label="轮询间隔" value={fmtDuration(config.poll_interval_seconds)} />
          <StatCard label="诊断" value={diag.ready ? '就绪' : '阻塞'} color={diag.ready ? 'text-success' : 'text-destructive'} />
        </div>
      )}

      {/* Manual poll */}
      <div className="rounded-xl border p-4">
        <h3 className="font-semibold mb-2">手动操作</h3>
        <Button onClick={() => triggerPollMutation.mutate()} disabled={triggerPollMutation.isPending} aria-busy={triggerPollMutation.isPending}>
          {triggerPollMutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {triggerPollMutation.isPending ? '轮询中...' : '触发轮询'}
        </Button>
      </div>

      {/* Videos section */}
      <div className="rounded-xl border space-y-4">
        <div className="border-b px-6 py-4 flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-semibold">视频监控</h3>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="bvid-input" className="text-xs text-muted-foreground">BVID</Label>
              <Input
                id="bvid-input"
                ref={bvidInputRef}
                placeholder="输入 BVID"
                value={bvid}
                onChange={(e) => setBvid(e.target.value)}
                className="w-40"
                onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
              />
            </div>
            <Button size="sm" onClick={handleAddVideo} disabled={addVideoMutation.isPending} aria-busy={addVideoMutation.isPending}>
              {addVideoMutation.isPending
                ? <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
                : <Plus className="mr-1 h-3 w-3" aria-hidden="true" />}
              {addVideoMutation.isPending ? '添加中...' : '添加'}
            </Button>
          </div>
        </div>
        <div className="px-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="poll-filter" className="text-sm">轮询状态</Label>
            <Select value={pollFilter} onValueChange={(v) => { setPollFilter(v); setVideoOffset(0) }}>
              <SelectTrigger id="poll-filter" className="w-32"><SelectValue placeholder="全部" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部状态</SelectItem>
                <SelectItem value="true">仅轮询中</SelectItem>
                <SelectItem value="false">仅已停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" disabled={videoOffset <= 0} onClick={() => setVideoOffset(Math.max(0, videoOffset - PAGE_SIZE))}>上一页</Button>
          <Button size="sm" variant="outline" disabled={videoOffset + videos.length >= videosTotal} onClick={() => setVideoOffset(videoOffset + PAGE_SIZE)}>下一页</Button>
          <span className="text-sm text-muted-foreground">
            第 {videosTotal === 0 ? 0 : videoOffset + 1}–{Math.min(videoOffset + PAGE_SIZE, videosTotal)} 条，共 {videosTotal} 条
          </span>
        </div>

        <div className="p-6">
          {videosLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-4 text-muted-foreground">
              <p>暂无视频。输入 BVID 添加第一个监控视频，系统将自动轮询其评论。</p>
              <Button variant="outline" size="sm" onClick={() => bvidInputRef.current?.focus()}>
                添加第一个视频
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BVID</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>轮询</TableHead>
                  <TableHead>评论数</TableHead>
                  <TableHead>最后轮询</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((v: BilibiliVideo) => {
                  const vid = String(v.id || v.video_id || '')
                  const togglePending = togglePollMutation.isPending && togglePollMutation.variables === vid
                  const syncPending = syncVideoMutation.isPending && syncVideoMutation.variables === vid
                  const deletePending = deleteVideoMutation.isPending && deleteVideoMutation.variables === vid
                  return (
                    <TableRow key={vid}>
                      <TableCell className="font-mono text-sm md:text-xs" title={v.bvid}>{v.bvid || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{v.title || '-'}</TableCell>
                      <TableCell>
                        <BoolBadge value={!!v.poll_enabled} trueLabel="轮询中" falseLabel="已停用" />
                      </TableCell>
                      <TableCell>{v.comment_count ?? 0}</TableCell>
                      <TableCell><Timestamp value={v.last_polled_at} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => togglePollMutation.mutate(vid)}
                            disabled={togglePending}
                            aria-busy={togglePending}
                          >
                            {togglePending && <Loader2 className="animate-spin" aria-hidden="true" />}
                            {togglePending ? '处理中...' : v.poll_enabled ? '禁用轮询' : '启用轮询'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => syncVideoMutation.mutate(vid)}
                            disabled={syncPending}
                            aria-label={`同步视频 ${v.bvid || vid}`}
                            aria-busy={syncPending}
                          >
                            {syncPending
                              ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                              : <RotateCw className="h-3 w-3" aria-hidden="true" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteTarget({ kind: 'video', id: vid })}
                            disabled={deletePending}
                            aria-label={`删除视频 ${v.bvid || vid}`}
                            aria-busy={deletePending}
                          >
                            {deletePending
                              ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                              : <Trash2 className="h-3 w-3" aria-hidden="true" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Credentials section */}
      <div className="rounded-xl border space-y-4">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <span className="font-semibold">凭证管理</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowCredValues(v => !v)}
            aria-label={showCredValues ? '隐藏凭证值' : '显示凭证值'}
            aria-pressed={showCredValues}
          >
            {showCredValues ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="cred-name">名称</Label><Input id="cred-name" ref={credNameInputRef} value={credName} onChange={(e) => setCredName(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="cred-sessdata">SESSDATA</Label><Input id="cred-sessdata" type={credInputType} autoComplete="off" value={sessdata} onChange={(e) => setSessdata(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1"><Label htmlFor="cred-bili-jct">bili_jct</Label><Input id="cred-bili-jct" type={credInputType} autoComplete="off" value={biliJct} onChange={(e) => setBiliJct(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="cred-buvid3">buvid3</Label><Input id="cred-buvid3" type={credInputType} autoComplete="off" value={buvid3} onChange={(e) => setBuvid3(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="cred-buvid4">buvid4</Label><Input id="cred-buvid4" type={credInputType} autoComplete="off" value={buvid4} onChange={(e) => setBuvid4(e.target.value)} /></div>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1"><Label htmlFor="cred-expires">过期时间</Label><Input id="cred-expires" type="datetime-local" value={credExpires} onChange={(e) => setCredExpires(e.target.value)} /></div>
            <Button variant="secondary" onClick={handleAddCred} disabled={addCredMutation.isPending} aria-busy={addCredMutation.isPending}>
              {addCredMutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {addCredMutation.isPending ? '添加中...' : '添加凭证'}
            </Button>
          </div>
        </div>

        <div className="px-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="cred-active-filter" className="text-sm">激活状态</Label>
            <Select value={credActiveFilter} onValueChange={setCredActiveFilter}>
              <SelectTrigger id="cred-active-filter" className="w-28"><SelectValue placeholder="全部" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部</SelectItem>
                <SelectItem value="active">仅激活</SelectItem>
                <SelectItem value="inactive">仅未激活</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="cred-expiry-filter" className="text-sm">过期状态</Label>
            <Select value={credExpiryFilter} onValueChange={setCredExpiryFilter}>
              <SelectTrigger id="cred-expiry-filter" className="w-28"><SelectValue placeholder="全部" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部</SelectItem>
                <SelectItem value="expired">已过期</SelectItem>
                <SelectItem value="expiring">即将过期</SelectItem>
                <SelectItem value="valid">有效期内</SelectItem>
                <SelectItem value="unset">未设置</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-6">
          {credsLoading ? (
            <TableSkeleton rows={3} columns={5} />
          ) : filteredCreds.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-4 text-muted-foreground">
              <p>暂无凭证。添加一组 B 站凭证（SESSDATA 等）后即可启用发布。</p>
              <Button variant="outline" size="sm" onClick={() => credNameInputRef.current?.focus()}>
                添加第一组凭证
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>凭证摘要</TableHead>
                  <TableHead>激活</TableHead>
                  <TableHead>过期状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCreds.map((c: BilibiliCredential) => {
                  const cid = String(c.id || c.credential_id || '')
                  const exp = resolveCredentialExpiry(c.expires_at)
                  const activatePending = activateCredMutation.isPending && activateCredMutation.variables === cid
                  const credDeletePending = deleteCredMutation.isPending && deleteCredMutation.variables === cid
                  return (
                    <TableRow key={cid}>
                      <TableCell>{c.name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm md:text-xs">{fingerprint(c)}</TableCell>
                      <TableCell>
                        <BoolBadge value={!!(c.is_active || c.active)} trueLabel="已激活" falseLabel="未激活" />
                      </TableCell>
                      <TableCell className={exp.color}>{exp.label}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!(c.is_active || c.active) && (
                            <Button size="sm" variant="outline" onClick={() => activateCredMutation.mutate(cid)} disabled={activatePending} aria-busy={activatePending}>
                              {activatePending && <Loader2 className="animate-spin" aria-hidden="true" />}
                              {activatePending ? '激活中...' : '激活'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteTarget({ kind: 'credential', id: cid })}
                            disabled={credDeletePending}
                            aria-label={`删除凭证 ${c.name || cid}`}
                            aria-busy={credDeletePending}
                          >
                            {credDeletePending
                              ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                              : <Trash2 className="h-3 w-3" aria-hidden="true" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Destructive confirm dialog (replaces native confirm()) */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTarget?.kind === 'video' ? '删除视频？' : '删除凭证？'}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === 'video'
                ? '删除后该视频将停止轮询，相关历史不会保留。此操作无法撤销。'
                : '删除后该凭证立即失效，依赖它的发布/采集会中断。此操作无法撤销。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
