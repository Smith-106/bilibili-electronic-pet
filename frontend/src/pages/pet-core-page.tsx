import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createAdminApi } from '@/lib/admin-api'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

const api = createAdminApi()

const PET_ACTIONS: Array<{ key: string; label: string; variant: 'default' | 'secondary' | 'outline' }> = [
  { key: 'pat', label: 'Pat', variant: 'default' },
  { key: 'feed', label: 'Feed', variant: 'secondary' },
  { key: 'wake', label: 'Wake', variant: 'outline' },
]

export function PetCorePage() {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [actionPending, setActionPending] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pet-overview'],
    queryFn: () => api.getPetOverview(),
  })

  const actionMutation = useMutation({
    mutationFn: ({ action, note }: { action: string; note: string }) =>
      api.recordPetAction(action, note || ''),
    onSuccess: (_, vars) => {
      const label = PET_ACTIONS.find(a => a.key === vars.action)?.label || vars.action
      toast.success(`${label} 已记录`)
      queryClient.invalidateQueries({ queryKey: ['pet-overview'] })
    },
    onError: (err: Error) => {
      toast.error(`宠物动作失败: ${err.message}`)
    },
    onSettled: () => {
      setActionPending('')
    },
  })

  const item = (data as Record<string, unknown>)?.item as Record<string, unknown> || {}
  const snapshot = (item.snapshot as Record<string, unknown>) || {}
  const companion = (item.companion as Record<string, unknown>) || {}
  const relationship = (snapshot.relationship as Record<string, unknown>) || {}
  const progress = (snapshot.progress as Record<string, unknown>) || {}
  const needs = (snapshot.needs as Array<Record<string, unknown>>) || []
  const signals = (snapshot.proactiveSignals as Array<Record<string, unknown>>) || []
  const recentInteractions = (companion.recentInteractions as Array<Record<string, unknown>>) || []

  function handleAction(actionKey: string) {
    setActionPending(actionKey)
    const trimmedNote = note.trim().slice(0, 160)
    actionMutation.mutate({ action: actionKey, note: trimmedNote })
    setNote('')
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">加载宠物状态...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">宠物核心</h1>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> 刷新
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Relationship */}
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">关系与阶段</h3>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="关系等级" value={String(relationship.level || '-')} className="border-0 bg-muted/40" />
            <StatCard label="当前阶段" value={String(progress.progressLabel || '-')} className="border-0 bg-muted/40" />
          </div>
          <p className="text-sm text-muted-foreground">{String(relationship.note || '')}</p>
          <p className="text-sm text-muted-foreground">{String(progress.nextMilestone || '暂无下一阶段里程碑')}</p>
        </div>

        {/* Needs */}
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">需求状态</h3>
          {needs.length === 0 ? (
            <div className="text-sm text-muted-foreground">暂无需求数据</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {needs.map((n, i) => (
                <StatCard key={i} label={String(n.label || n.key || '需求')} value={String(n.value || '-')} className="border-0 bg-muted/40" />
              ))}
            </div>
          )}
        </div>

        {/* Proactive Signals */}
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">主动信号</h3>
          {signals.length === 0 ? (
            <div className="text-sm text-muted-foreground">暂无主动信号</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {signals.map((s, i) => (
                <li key={i}>
                  <strong>{String(s.label || s.key || '信号')}</strong>: {String(s.detail || '-')}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Companion Summary */}
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">伙伴摘要</h3>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="宠物名" value={String(companion.petName || '-')} className="border-0 bg-muted/40" />
            <StatCard label="循环模式" value={String(companion.loopMode || '-')} className="border-0 bg-muted/40" />
            <StatCard label="状态来源" value={String(companion.adapterLabel || '-')} className="border-0 bg-muted/40" />
          </div>
          <p className="text-sm text-muted-foreground">{String(companion.statusLine || '')}</p>
        </div>

        {/* Loop Actions */}
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">循环动作 (Loop)</h3>
          <p className="text-sm text-muted-foreground">直接记录 Pat / Feed / Wake，验证宠物循环是否仍能持续推进。</p>
          <div className="space-y-1">
            <Label htmlFor="pet-action-note">动作备注</Label>
            <Textarea
              id="pet-action-note"
              rows={3}
              maxLength={160}
              placeholder="可选备注，会写入 pet-core 交互历史。"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {PET_ACTIONS.map(a => (
              <Button
                key={a.key}
                size="sm"
                variant={a.variant}
                onClick={() => handleAction(a.key)}
                disabled={!!actionPending}
                aria-busy={actionPending === a.key}
              >
                {actionPending === a.key ? `${a.label}...` : a.label}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {actionPending ? '正在记录...' : '准备记录下一次宠物动作。'}
          </p>
        </div>

        {/* Recent Interactions */}
        <div className="rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">最近交互</h3>
          {recentInteractions.length === 0 ? (
            <div className="text-sm text-muted-foreground">暂无最近交互</div>
          ) : (
            <div className="space-y-3">
              {recentInteractions.map((item, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{String(item.title || item.kind || '互动')}</div>
                      <div className="text-xs text-muted-foreground mt-1">{String(item.detail || '-')}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-muted-foreground">{String(item.source || 'pet-core')}</div>
                      <div className="text-muted-foreground mt-1">{String(item.timestamp || '-')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
