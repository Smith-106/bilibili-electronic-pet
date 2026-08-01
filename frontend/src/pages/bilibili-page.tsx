import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createAdminApi, type BilibiliVideo, type BilibiliCredential } from '@/lib/admin-api'
import { StatCard } from '@/components/stat-card'
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
import { RefreshCw, Plus, Trash2, RotateCw } from 'lucide-react'
import { toast } from 'sonner'

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
function fmtBool(val: unknown): string { return val ? '✅' : '❌' }

function resolveCredentialExpiry(expiresAt?: string): { label: string; color: string } {
  if (!expiresAt) return { label: '未设置', color: 'text-muted-foreground' }
  const d = new Date(expiresAt)
  if (isNaN(d.getTime())) return { label: '无效', color: 'text-destructive' }
  const diff = d.getTime() - Date.now()
  if (diff < 0) return { label: '已过期', color: 'text-destructive' }
  if (diff < 7 * 86400000) return { label: '即将过期', color: 'text-yellow-600 dark:text-yellow-400' }
  return { label: '有效期内', color: 'text-green-600 dark:text-green-400' }
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
  // Credential filters
  const [credActiveFilter, setCredActiveFilter] = useState('')
  const [credExpiryFilter, setCredExpiryFilter] = useState('')

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
      poll_enabled: pollFilter === '' ? undefined : pollFilter === 'true',
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
    onError: (err: Error) => toast.error(`添加失败: ${err.message}`),
  })
  const togglePollMutation = useMutation({
    mutationFn: (videoId: string) => api.toggleBilibiliVideoPoll(videoId),
    onSuccess: () => { toast.success('操作成功'); invalidateAll() },
    onError: (err: Error) => toast.error(`失败: ${err.message}`),
  })
  const syncVideoMutation = useMutation({
    mutationFn: (videoId: string) => api.syncBilibiliVideo(videoId),
    onSuccess: () => { toast.success('同步成功'); invalidateAll() },
    onError: (err: Error) => toast.error(`同步失败: ${err.message}`),
  })
  const deleteVideoMutation = useMutation({
    mutationFn: (videoId: string) => api.deleteBilibiliVideo(videoId),
    onSuccess: () => { toast.success('已删除'); invalidateAll() },
    onError: (err: Error) => toast.error(`删除失败: ${err.message}`),
  })
  const triggerPollMutation = useMutation({
    mutationFn: () => api.triggerBilibiliPoll(),
    onSuccess: () => { toast.success('轮询已触发'); invalidateAll() },
    onError: (err: Error) => toast.error(`轮询失败: ${err.message}`),
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
    onError: (err: Error) => toast.error(`添加失败: ${err.message}`),
  })
  const activateCredMutation = useMutation({
    mutationFn: (id: string) => api.activateBilibiliCredential(id),
    onSuccess: () => { toast.success('已激活'); invalidateAll() },
    onError: (err: Error) => toast.error(`激活失败: ${err.message}`),
  })
  const deleteCredMutation = useMutation({
    mutationFn: (id: string) => api.deleteBilibiliCredential(id),
    onSuccess: () => { toast.success('已删除'); invalidateAll() },
    onError: (err: Error) => toast.error(`删除失败: ${err.message}`),
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
    if (credActiveFilter === 'active' && !(c.is_active || c.active)) return false
    if (credActiveFilter === 'inactive' && (c.is_active || c.active)) return false
    if (credExpiryFilter) {
      const exp = resolveCredentialExpiry(c.expires_at)
      if (credExpiryFilter === 'expired' && exp.label !== '已过期') return false
      if (credExpiryFilter === 'expiring' && exp.label !== '即将过期') return false
      if (credExpiryFilter === 'valid' && exp.label !== '有效期内') return false
      if (credExpiryFilter === 'unset' && exp.label !== '未设置') return false
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">B站集成</h1>
        <Button variant="outline" onClick={() => invalidateAll()}>
          <RefreshCw className="mr-2 h-4 w-4" /> 刷新
        </Button>
      </div>

      {/* Status cards */}
      {statusLoading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard label="启用" value={fmtBool(sd.enabled)} hint={fmtToggle(sd.enabled, '已启用', '已停用')} />
          <StatCard label="轮询" value={fmtBool(sd.polling_enabled)} hint={fmtToggle(sd.polling_enabled, '自动抓取', '仅手动')} />
          <StatCard label="发布" value={fmtBool(sd.publish_enabled)} hint={fmtToggle(sd.publish_enabled, '已启用', '已停用')} />
          <StatCard label="视频数" value={String(totalVideos)} hint={`轮询中 ${pollEnabledCount}`} />
          <StatCard label="轮询间隔" value={fmtDuration(config.poll_interval_seconds)} />
          <StatCard label="诊断" value={diag.ready ? '就绪' : '阻塞'} color={diag.ready ? 'text-green-600' : 'text-red-600'} />
        </div>
      )}

      {/* Manual poll */}
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-2">手动操作</h3>
        <Button onClick={() => triggerPollMutation.mutate()} disabled={triggerPollMutation.isPending}>
          {triggerPollMutation.isPending ? '轮询中...' : '触发轮询'}
        </Button>
      </div>

      {/* Videos section */}
      <div className="rounded-lg border space-y-4">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold">视频监控</h3>
          <div className="flex items-center gap-2">
            <Input placeholder="输入 BVID" value={bvid} onChange={(e) => setBvid(e.target.value)} className="w-40" onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()} />
            <Button size="sm" onClick={handleAddVideo} disabled={addVideoMutation.isPending}>
              <Plus className="mr-1 h-3 w-3" /> 添加
            </Button>
          </div>
        </div>
        <div className="px-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">轮询状态</Label>
            <Select value={pollFilter} onValueChange={(v) => { setPollFilter(v); setVideoOffset(0) }}>
              <SelectTrigger className="w-32"><SelectValue placeholder="全部" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部状态</SelectItem>
                <SelectItem value="true">仅轮询中</SelectItem>
                <SelectItem value="false">仅已停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" disabled={videoOffset <= 0} onClick={() => setVideoOffset(Math.max(0, videoOffset - PAGE_SIZE))}>上一页</Button>
          <Button size="sm" variant="outline" disabled={videoOffset + videos.length >= videosTotal} onClick={() => setVideoOffset(videoOffset + PAGE_SIZE)}>下一页</Button>
          <span className="text-sm text-muted-foreground">共 {videosTotal} 条，当前偏移 {videoOffset}</span>
        </div>

        <div className="p-6">
          {videosLoading ? (
            <div className="text-center py-4 text-muted-foreground">加载中...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">暂无视频</div>
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
                  return (
                    <TableRow key={vid}>
                      <TableCell className="font-mono text-xs" title={v.bvid}>{v.bvid || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{v.title || '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={v.poll_enabled ? 'published' : 'skipped'} />
                      </TableCell>
                      <TableCell>{v.comment_count ?? 0}</TableCell>
                      <TableCell><Timestamp value={v.last_polled_at} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => togglePollMutation.mutate(vid)}>
                            {v.poll_enabled ? '禁用轮询' : '启用轮询'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => syncVideoMutation.mutate(vid)}>
                            <RotateCw className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { if (confirm('确定删除此视频？')) deleteVideoMutation.mutate(vid) }}>
                            <Trash2 className="h-3 w-3" />
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
      <div className="rounded-lg border space-y-4">
        <div className="border-b px-6 py-4 font-semibold">凭证管理</div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>名称</Label><Input value={credName} onChange={(e) => setCredName(e.target.value)} /></div>
            <div className="space-y-1"><Label>SESSDATA</Label><Input value={sessdata} onChange={(e) => setSessdata(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label>bili_jct</Label><Input value={biliJct} onChange={(e) => setBiliJct(e.target.value)} /></div>
            <div className="space-y-1"><Label>buvid3</Label><Input value={buvid3} onChange={(e) => setBuvid3(e.target.value)} /></div>
            <div className="space-y-1"><Label>buvid4</Label><Input value={buvid4} onChange={(e) => setBuvid4(e.target.value)} /></div>
          </div>
          <div className="flex items-end gap-4">
            <div className="space-y-1"><Label>过期时间</Label><Input type="datetime-local" value={credExpires} onChange={(e) => setCredExpires(e.target.value)} /></div>
            <Button onClick={handleAddCred} disabled={addCredMutation.isPending}>添加凭证</Button>
          </div>
        </div>

        <div className="px-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">激活状态</Label>
            <Select value={credActiveFilter} onValueChange={setCredActiveFilter}>
              <SelectTrigger className="w-28"><SelectValue placeholder="全部" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部</SelectItem>
                <SelectItem value="active">仅激活</SelectItem>
                <SelectItem value="inactive">仅未激活</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">过期状态</Label>
            <Select value={credExpiryFilter} onValueChange={setCredExpiryFilter}>
              <SelectTrigger className="w-28"><SelectValue placeholder="全部" /></SelectTrigger>
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
            <div className="text-center py-4 text-muted-foreground">加载中...</div>
          ) : filteredCreds.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">暂无凭证</div>
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
                  return (
                    <TableRow key={cid}>
                      <TableCell>{c.name || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{fingerprint(c)}</TableCell>
                      <TableCell>
                        <StatusBadge status={(c.is_active || c.active) ? 'published' : 'skipped'} />
                      </TableCell>
                      <TableCell className={exp.color}>{exp.label}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!(c.is_active || c.active) && (
                            <Button size="sm" variant="outline" onClick={() => activateCredMutation.mutate(cid)}>激活</Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => { if (confirm('确定删除此凭证？')) deleteCredMutation.mutate(cid) }}>
                            <Trash2 className="h-3 w-3" />
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
    </div>
  )
}
