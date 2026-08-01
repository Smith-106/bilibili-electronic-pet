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
import { RefreshCw, Plus } from 'lucide-react'
import { toast } from 'sonner'

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

export function RoleCardsPage() {
  const queryClient = useQueryClient()
  const [selectedKey, setSelectedKey] = useState('')
  const [form, setForm] = useState<CardFormData>(emptyForm)
  const [originalData, setOriginalData] = useState<RoleCard | null>(null)
  const dirtyRef = useRef(false)

  const { data } = useQuery({
    queryKey: ['role-cards'],
    queryFn: () => api.getRoleCards({ limit: 100 }),
  })

  const cards = (data?.items ?? []) as Array<RoleCard & { key?: string; name?: string; description?: string; system_prompt?: string; tone?: string; constraints?: unknown; enabled?: boolean }>

  function checkDirty(): boolean {
    if (!dirtyRef.current) return true
    return confirm('当前角色卡有未保存的修改，确定要切换吗？')
  }

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

  const handleSelectChange = useCallback((key: string) => {
    if (!checkDirty()) return
    setSelectedKey(key)
    const card = cards.find(c => c.key === key)
    fillEditor(card || null)
  }, [cards])

  function handleNew() {
    if (!checkDirty()) return
    setSelectedKey('')
    fillEditor(null)
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
      toast.error(`操作失败: ${(err as Error).message}`)
    }
  }

  async function handleActivate() {
    if (!originalData?.key) return
    try {
      await api.activateRoleCard(originalData.key)
      toast.success('已激活')
      await queryClient.invalidateQueries({ queryKey: ['role-cards'] })
    } catch (err) { toast.error(`激活失败: ${(err as Error).message}`) }
  }

  async function handleDisable() {
    if (!originalData?.key) return
    try {
      await api.disableRoleCard(originalData.key)
      toast.success('已禁用')
      await queryClient.invalidateQueries({ queryKey: ['role-cards'] })
    } catch (err) { toast.error(`禁用失败: ${(err as Error).message}`) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">角色卡管理</h1>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['role-cards'] })}>
          <RefreshCw className="mr-2 h-4 w-4" /> 刷新
        </Button>
      </div>

      {/* Selector */}
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label>选择角色卡</Label>
          <Select value={selectedKey} onValueChange={handleSelectChange}>
            <SelectTrigger className="w-64"><SelectValue placeholder="-- 新建 --" /></SelectTrigger>
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
          <Plus className="mr-2 h-4 w-4" /> 新建
        </Button>
      </div>

      {/* Editor */}
      <div className="rounded-lg border p-6 space-y-4">
        <h3 className="text-lg font-medium">
          {originalData ? `编辑: ${originalData.name || originalData.key}` : '新建角色卡'}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Key</Label>
            <Input placeholder="唯一标识 (英文)" value={form.key} onChange={(e) => updateField('key', e.target.value)} disabled={!!originalData} />
          </div>
          <div className="space-y-1">
            <Label>名称</Label>
            <Input placeholder="角色名称" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>描述</Label>
          <Input placeholder="简短描述" value={form.description} onChange={(e) => updateField('description', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>System Prompt</Label>
          <Textarea rows={4} placeholder="系统提示词" value={form.system_prompt} onChange={(e) => updateField('system_prompt', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>语气 (Tone)</Label>
          <Input placeholder="例: friendly, witty" value={form.tone} onChange={(e) => updateField('tone', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>约束 (Constraints)</Label>
          <Textarea rows={2} placeholder="行为约束，JSON 或文本" value={form.constraints} onChange={(e) => updateField('constraints', e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave}>保存</Button>
          {originalData && originalData.enabled === false && (
            <Button variant="secondary" onClick={handleActivate}>激活</Button>
          )}
          {originalData && originalData.enabled !== false && (
            <Button variant="destructive" onClick={handleDisable}>禁用</Button>
          )}
        </div>
      </div>
    </div>
  )
}
