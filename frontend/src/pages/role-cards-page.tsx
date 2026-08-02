import { useState, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createAdminApi, type RoleCard } from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { RefreshCw, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { toastMutationError } from '@/lib/feedback'

const api = createAdminApi()

interface CardFormData {
  key: string
  name: string
  description: string
  system_prompt: string
  tone: string
  constraints: string
}

const emptyForm: CardFormData = { key: '', name: '', description: '', system_prompt: '', tone: '', constraints: '' }

type PendingNav = { kind: 'select'; key: string } | { kind: 'new' } | null
type PendingAction = 'save' | 'activate' | 'disable' | null

export function RoleCardsPage() {
  const queryClient = useQueryClient()
  const [selectedKey, setSelectedKey] = useState('')
  const [form, setForm] = useState<CardFormData>(emptyForm)
  const [originalData, setOriginalData] = useState<RoleCard | null>(null)
  const [pendingNav, setPendingNav] = useState<PendingNav>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const dirtyRef = useRef(false)

  const { data } = useQuery({
    queryKey: ['role-cards'],
    queryFn: () => api.getRoleCards({ limit: 100 }),
  })

  const cards = (data?.items ?? []) as Array<RoleCard & { key?: string; name?: string; description?: string; system_prompt?: string; tone?: string; constraints?: unknown; enabled?: boolean }>

  function fillEditor(card: typeof cards[number] | null) {
    setOriginalData(card ?? null)
    setForm({
      key: card?.key || '',
      name: card?.name || '',
      description: card?.description || '',
      system_prompt: card?.system_prompt || '',
      tone: card?.tone || '',
      constraints: typeof card?.constraints === 'string' ? card.constraints : JSON.stringify(card?.constraints || '', null, 2),
    })
    dirtyRef.current = false
  }

  function proceedNav(nav: PendingNav) {
    if (!nav) return
    if (nav.kind === 'select') {
      setSelectedKey(nav.key)
      fillEditor(cards.find(c => c.key === nav.key) || null)
    } else {
      setSelectedKey('')
      fillEditor(null)
    }
  }

  /** Dirty guard: clean → proceed immediately; dirty → confirm via AlertDialog */
  function guardedNav(nav: Exclude<PendingNav, null>) {
    if (!dirtyRef.current) {
      proceedNav(nav)
      return
    }
    setPendingNav(nav)
  }

  const handleSelectChange = useCallback((key: string) => {
    guardedNav({ kind: 'select', key })
  }, [cards])

  function handleNew() {
    guardedNav({ kind: 'new' })
  }

  function updateField(field: keyof CardFormData, value: string) {
    dirtyRef.current = true
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    const payload: Record<string, unknown> = {
      key: form.key.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      system_prompt: form.system_prompt.trim(),
      tone: form.tone.trim(),
    }
    const raw = form.constraints.trim()
    try {
      payload.constraints = raw ? JSON.parse(raw) : ''
    } catch {
      payload.constraints = raw
    }

    if (!payload.key) { toast.warning('Key 不能为空'); return }

    setPendingAction('save')
    try {
      if (originalData?.key) {
        await api.updateRoleCard(originalData.key, payload)
        toast.success('保存成功')
      } else {
        await api.createRoleCard(payload)
        toast.success('创建成功')
      }
      dirtyRef.current = false
      await queryClient.invalidateQueries({ queryKey: ['role-cards'] })
      setSelectedKey(form.key)
    } catch (err) {
      toastMutationError(`操作失败: ${(err as Error).message}`)
    } finally {
      setPendingAction(null)
    }
  }

  async function handleActivate() {
    if (!originalData?.key) return
    setPendingAction('activate')
    try {
      await api.activateRoleCard(originalData.key)
      toast.success('已激活')
      await queryClient.invalidateQueries({ queryKey: ['role-cards'] })
    } catch (err) {
      toastMutationError(`激活失败: ${(err as Error).message}`, { retry: handleActivate })
    }
    finally { setPendingAction(null) }
  }

  async function handleDisable() {
    if (!originalData?.key) return
    setPendingAction('disable')
    try {
      await api.disableRoleCard(originalData.key)
      toast.success('已禁用')
      await queryClient.invalidateQueries({ queryKey: ['role-cards'] })
    } catch (err) {
      toastMutationError(`禁用失败: ${(err as Error).message}`, { retry: handleDisable })
    }
    finally { setPendingAction(null) }
  }

  const busy = pendingAction !== null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">角色卡管理</h1>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['role-cards'] })}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> 刷新
        </Button>
      </div>

      {/* Selector */}
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="role-card-select">选择角色卡</Label>
          <Select value={selectedKey} onValueChange={handleSelectChange}>
            <SelectTrigger id="role-card-select" className="w-64"><SelectValue placeholder="-- 新建 --" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__new__">-- 新建 --</SelectItem>
              {cards.map(c => (
                <SelectItem key={c.key} value={c.key}>
                  {c.name || c.key}{c.enabled === false ? ' (禁用)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> 新建
        </Button>
      </div>

      {/* Editor */}
      <div className="rounded-xl border bg-card p-6 shadow-none space-y-4">
        <h3 className="text-lg font-medium">
          {originalData ? `编辑: ${originalData.name || originalData.key}` : '新建角色卡'}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="rc-key">Key</Label>
            <Input id="rc-key" placeholder="唯一标识 (英文)" value={form.key} onChange={(e) => updateField('key', e.target.value)} disabled={!!originalData} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rc-name">名称</Label>
            <Input id="rc-name" placeholder="角色名称" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rc-desc">描述</Label>
          <Input id="rc-desc" placeholder="简短描述" value={form.description} onChange={(e) => updateField('description', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rc-prompt">System Prompt</Label>
          <Textarea id="rc-prompt" rows={4} placeholder="系统提示词" value={form.system_prompt} onChange={(e) => updateField('system_prompt', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rc-tone">语气 (Tone)</Label>
          <Input id="rc-tone" placeholder="例: friendly, witty" value={form.tone} onChange={(e) => updateField('tone', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rc-constraints">约束 (Constraints)</Label>
          <Textarea id="rc-constraints" rows={2} placeholder="行为约束，JSON 或文本" value={form.constraints} onChange={(e) => updateField('constraints', e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={busy} aria-busy={pendingAction === 'save'}>
            {pendingAction === 'save' && <Loader2 className="animate-spin" aria-hidden="true" />}
            {pendingAction === 'save' ? '保存中...' : '保存角色卡'}
          </Button>
          {originalData && originalData.enabled === false && (
            <Button variant="secondary" onClick={handleActivate} disabled={busy} aria-busy={pendingAction === 'activate'}>
              {pendingAction === 'activate' && <Loader2 className="animate-spin" aria-hidden="true" />}
              {pendingAction === 'activate' ? '激活中...' : '激活'}
            </Button>
          )}
          {originalData && originalData.enabled !== false && (
            <Button variant="destructive" onClick={handleDisable} disabled={busy} aria-busy={pendingAction === 'disable'}>
              {pendingAction === 'disable' && <Loader2 className="animate-spin" aria-hidden="true" />}
              {pendingAction === 'disable' ? '禁用中...' : '禁用'}
            </Button>
          )}
        </div>
      </div>

      {/* Dirty-form navigation guard (replaces native confirm()) */}
      <AlertDialog open={pendingNav !== null} onOpenChange={(open) => { if (!open) setPendingNav(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>放弃未保存的修改？</AlertDialogTitle>
            <AlertDialogDescription>
              当前角色卡有未保存的修改，切换后这些修改将丢失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction onClick={() => { proceedNav(pendingNav); setPendingNav(null) }}>
              放弃修改
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
