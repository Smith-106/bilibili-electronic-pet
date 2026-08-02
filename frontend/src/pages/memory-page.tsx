import { useState, useCallback } from 'react'
import { createAdminApi } from '@/lib/admin-api'
import type { MemorySpace, MemoryItem } from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableSkeleton } from '@/components/table-skeleton'
import { toast } from 'sonner'
import { toastMutationError } from '@/lib/feedback'
import { Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const api = createAdminApi()

/* M-04: 后端 space_type/content_type/source 为自由字符串（开放值域，无枚举校验），
   故采用 Input + datalist 建议式（允许自由输入 + 提供常见值），而非封闭式 Select。
   建议值来源：设计指南推断 + 后端实际使用值（operator/system/companion_signal 等）。 */
const SPACE_TYPES = ['operator', 'project', 'archive', 'system']
const ITEM_TYPES = ['note', 'fact', 'preference', 'event', 'companion_signal']
const ITEM_SOURCES = ['operator', 'auto', 'user', 'system']

interface MemorySpaceData extends MemorySpace {}

interface MemoryItemsData extends MemoryItem {}

export function MemoryPage() {
  const queryClient = useQueryClient()
  const [spaceKey, setSpaceKey] = useState('')
  const [spaceType, setSpaceType] = useState('operator')
  const [spaceTitle, setSpaceTitle] = useState('')
  const [spaceSummary, setSpaceSummary] = useState('')

  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('')
  const [itemKey, setItemKey] = useState('')
  const [itemType, setItemType] = useState('note')
  const [itemSource, setItemSource] = useState('operator')
  const [itemContent, setItemContent] = useState('')

  // H-04: 删除确认目标 — 破坏性操作防护标准（约定 2 / RC-B）
  const [deleteTarget, setDeleteTarget] = useState<MemoryItemsData | null>(null)

  // Queries
  const { data: spaces, isLoading, refetch } = useQuery<{ items: MemorySpaceData[] }>({
    queryKey: ['memory-spaces'],
    queryFn: () => api.getMemorySpaces(),
  })

  const { data: items, isLoading: loadingItems } = useQuery<{ items: MemoryItemsData[] }>({
    queryKey: ['memory-items', selectedSpaceId],
    queryFn: () => (selectedSpaceId ? api.getMemorySpaceItems(Number(selectedSpaceId)) : Promise.resolve({ items: [] })),
    enabled: !!selectedSpaceId,
  })

  // Mutations
  const createSpaceMutation = useMutation({
    mutationFn: (data: { space_key: string; space_type: string; title: string; summary?: string }) =>
      api.createMemorySpace(data),
    onSuccess: () => {
      toast.success('记忆空间创建成功')
      queryClient.invalidateQueries({ queryKey: ['memory-spaces'] })
      // Reset form
      setSpaceKey('')
      setSpaceType('operator')
      setSpaceTitle('')
      setSpaceSummary('')
    },
    onError: (err) => {
      toastMutationError(`创建失败：${err.message}。请检查 Space Key 是否已被占用或格式是否正确`)
    },
  })

  const upsertItemMutation = useMutation({
    mutationFn: (data: { space_id: number; item_key: string; content_type: string; source: string; content: string }) =>
      api.upsertMemoryItem(data),
    onSuccess: () => {
      toast.success('记忆条目保存成功')
      if (selectedSpaceId) {
        queryClient.invalidateQueries({ queryKey: ['memory-items', selectedSpaceId] })
      }
      // Reset form
      setItemKey('')
      setItemType('note')
      setItemSource('operator')
      setItemContent('')
    },
    onError: (err) => {
      toastMutationError(`保存失败：${err.message}。请确认所属空间与 Item Key 填写正确后重试`)
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (params: { spaceId: number; itemId: number }) => api.deleteMemoryItem(params.spaceId, params.itemId),
    onSuccess: () => {
      toast.success('记忆条目删除成功')
      if (selectedSpaceId) {
        queryClient.invalidateQueries({ queryKey: ['memory-items', selectedSpaceId] })
      }
    },
    onError: (err) => {
      toastMutationError(`删除失败：${err.message}。请稍后重试`)
    },
  })

  const handleRefresh = useCallback(() => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['memory-items', selectedSpaceId] })
  }, [refetch, queryClient, selectedSpaceId])

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!spaceKey || !spaceTitle) return
    await createSpaceMutation.mutateAsync({ space_key: spaceKey, space_type: spaceType, title: spaceTitle, summary: spaceSummary })
  }

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSpaceId || !itemKey || !itemContent) return
    await upsertItemMutation.mutateAsync({ space_id: Number(selectedSpaceId), item_key: itemKey, content_type: itemType, source: itemSource, content: itemContent })
  }

  if (isLoading) {
    return <div className="p-6"><TableSkeleton rows={3} columns={5} /></div>
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Memory 管理</h1>
        <Button onClick={handleRefresh} variant="outline">刷新列表</Button>
      </div>

      {/* Create Space Form */}
      <Card>
        <CardHeader>
          <CardTitle>新增记忆空间</CardTitle>
          <CardDescription>Space Key 用于唯一标识空间，创建后不可修改</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSpace} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="space-key">Space Key</Label>
              <Input id="space-key" placeholder="operator:alpha" value={spaceKey} onChange={(e) => setSpaceKey(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="space-type">类型</Label>
              <Input id="space-type" list="space-type-options" value={spaceType} onChange={(e) => setSpaceType(e.target.value)} />
              <datalist id="space-type-options">
                {SPACE_TYPES.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="space-title">标题</Label>
              <Input id="space-title" placeholder="Alpha Operator" value={spaceTitle} onChange={(e) => setSpaceTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="space-summary">摘要</Label>
              <Input id="space-summary" placeholder="简短描述" value={spaceSummary} onChange={(e) => setSpaceSummary(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={createSpaceMutation.isPending} aria-busy={createSpaceMutation.isPending}>
                {createSpaceMutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
                {createSpaceMutation.isPending ? '创建中...' : '创建记忆空间'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Upsert Item Form */}
      <Card>
        <CardHeader>
          <CardTitle>新增 / 更新记忆条目</CardTitle>
          <CardDescription>在选定的空间中保存或更新一条记忆条目</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveItem} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="item-space">所属空间</Label>
              <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
                <SelectTrigger id="item-space">
                  <SelectValue placeholder="选择空间" />
                </SelectTrigger>
                <SelectContent>
                  {spaces?.items.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.title} ({s.space_key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-key">Item Key</Label>
              <Input id="item-key" placeholder="status:latest" value={itemKey} onChange={(e) => setItemKey(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-type">类型</Label>
              <Input id="item-type" list="item-type-options" value={itemType} onChange={(e) => setItemType(e.target.value)} />
              <datalist id="item-type-options">
                {ITEM_TYPES.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-source">来源</Label>
              <Input id="item-source" list="item-source-options" value={itemSource} onChange={(e) => setItemSource(e.target.value)} />
              <datalist id="item-source-options">
                {ITEM_SOURCES.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="item-content">内容</Label>
              <Textarea id="item-content" rows={3} placeholder="记忆内容" value={itemContent} onChange={(e) => setItemContent(e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={upsertItemMutation.isPending || !selectedSpaceId || !itemKey} aria-busy={upsertItemMutation.isPending}>
                {upsertItemMutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
                {upsertItemMutation.isPending ? '保存中...' : '保存条目'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Spaces Table */}
      <Card>
        <CardHeader>
          <CardTitle>记忆空间列表</CardTitle>
          <CardDescription>共 {spaces?.items.length ?? 0} 个空间，创建成功后即时生效</CardDescription>
        </CardHeader>
        <CardContent>
          {!spaces?.items || spaces.items.length === 0 ? (
            <div className="text-muted-foreground p-4">暂无记忆空间，请先通过上方表单创建</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Space Key</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>摘要</TableHead>
                  <TableHead>更新时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spaces.items.map((space) => (
                  <TableRow key={space.id}>
                    <TableCell className="font-mono text-sm md:text-xs">{String(space.id).substring(0, 8)}</TableCell>
                    <TableCell>{String(space.space_key)}</TableCell>
                    <TableCell>{String(space.space_type)}</TableCell>
                    <TableCell>{String(space.title)}</TableCell>
                    <TableCell className="max-w-xs truncate" title={String(space.summary ?? '')}>
                      {String(space.summary ?? '').substring(0, 80)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {space.updated_at ? new Date(space.updated_at).toLocaleString('zh-CN') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>记忆条目</CardTitle>
          <CardDescription>相同 Item Key 的条目会被覆盖更新（upsert）</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedSpaceId && items?.items.length !== 0 && (
            <div className="text-muted-foreground p-4">请从上方选择一个空间查看其条目</div>
          )}
          {loadingItems ? (
            <TableSkeleton rows={4} columns={7} />
          ) : !items?.items || items.items.length === 0 ? (
            <div className="text-muted-foreground p-4">该空间暂无记忆条目，可通过上方表单添加</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Space ID</TableHead>
                  <TableHead>Item Key</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm md:text-xs">{String(item.id).substring(0, 8)}</TableCell>
                    <TableCell className="font-mono text-sm md:text-xs">{String(item.space_id).substring(0, 8)}</TableCell>
                    <TableCell>{String(item.item_key)}</TableCell>
                    <TableCell>{String(item.content_type)}</TableCell>
                    <TableCell>{String(item.source)}</TableCell>
                    <TableCell className="max-w-lg truncate" title={String(item.content ?? '')}>
                      {String(item.content ?? '').substring(0, 100)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const rowPending = deleteItemMutation.isPending && deleteItemMutation.variables?.itemId === Number(item.id)
                        return (
                          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(item)} disabled={deleteItemMutation.isPending} aria-busy={rowPending}>
                            {rowPending && <Loader2 className="animate-spin" aria-hidden="true" />}
                            {rowPending ? '删除中...' : '删除'}
                          </Button>
                        )
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* H-04: 删除确认弹窗 — 每页一个实例，与 deleteTarget state 联动（约定 2 / RC-B） */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除记忆条目？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除条目「{deleteTarget?.item_key}」，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteItemMutation.mutate({
                    spaceId: Number(deleteTarget.space_id),
                    itemId: Number(deleteTarget.id),
                  })
                }
                setDeleteTarget(null)
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
