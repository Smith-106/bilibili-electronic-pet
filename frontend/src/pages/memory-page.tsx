import { useState, useCallback } from 'react'
import { createAdminApi } from '@/lib/admin-api'
import type { MemorySpace, MemoryItem } from '@/lib/admin-api'
import { escapeHtml } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const api = createAdminApi()

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
      toast.success('Space 创建成功')
      queryClient.invalidateQueries({ queryKey: ['memory-spaces'] })
      // Reset form
      setSpaceKey('')
      setSpaceType('operator')
      setSpaceTitle('')
      setSpaceSummary('')
    },
    onError: (err) => {
      toast.error(`创建失败：${err.message}`)
    },
  })

  const upsertItemMutation = useMutation({
    mutationFn: (data: { space_id: number; item_key: string; content_type: string; source: string; content: string }) =>
      api.upsertMemoryItem(data),
    onSuccess: () => {
      toast.success('Item 保存成功')
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
      toast.error(`保存失败：${err.message}`)
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (params: { spaceId: number; itemId: number }) => api.deleteMemoryItem(params.spaceId, params.itemId),
    onSuccess: () => {
      toast.success('Item 删除成功')
      if (selectedSpaceId) {
        queryClient.invalidateQueries({ queryKey: ['memory-items', selectedSpaceId] })
      }
    },
    onError: (err) => {
      toast.error(`删除失败：${err.message}`)
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
    return <div className="p-6 text-muted-foreground">加载中...</div>
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Memory 管理</h1>
        <Button onClick={handleRefresh} variant="outline">刷新</Button>
      </div>

      {/* Create Space Form */}
      <Card>
        <CardHeader>
          <CardTitle>新增 Space</CardTitle>
          <CardDescription>创建一个新的记忆空间</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSpace} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="space-key">Space Key</label>
              <Input id="space-key" placeholder="operator:alpha" value={spaceKey} onChange={(e) => setSpaceKey(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="space-type">类型</label>
              <Input id="space-type" value={spaceType} onChange={(e) => setSpaceType(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="space-title">标题</label>
              <Input id="space-title" placeholder="Alpha Operator" value={spaceTitle} onChange={(e) => setSpaceTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="space-summary">摘要</label>
              <Input id="space-summary" placeholder="简短描述" value={spaceSummary} onChange={(e) => setSpaceSummary(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={createSpaceMutation.isPending}>
                {createSpaceMutation.isPending ? '创建中...' : '创建 Space'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Upsert Item Form */}
      <Card>
        <CardHeader>
          <CardTitle>新增 / 更新 Item</CardTitle>
          <CardDescription>在选定的空间中保存或更新一条记忆条目</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveItem} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="item-space">Space</label>
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
              <label className="text-sm font-medium" htmlFor="item-key">Item Key</label>
              <Input id="item-key" placeholder="status:latest" value={itemKey} onChange={(e) => setItemKey(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="item-type">类型</label>
              <Input id="item-type" value={itemType} onChange={(e) => setItemType(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="item-source">来源</label>
              <Input id="item-source" value={itemSource} onChange={(e) => setItemSource(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium" htmlFor="item-content">内容</label>
              <Textarea id="item-content" rows={3} placeholder="记忆内容" value={itemContent} onChange={(e) => setItemContent(e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={upsertItemMutation.isPending || !selectedSpaceId || !itemKey}>
                {upsertItemMutation.isPending ? '保存中...' : '保存 Item'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Spaces Table */}
      <Card>
        <CardHeader>
          <CardTitle>Memory Spaces</CardTitle>
          <CardDescription>所有已创建的记忆空间</CardDescription>
        </CardHeader>
        <CardContent>
          {!spaces?.items || spaces.items.length === 0 ? (
            <div className="text-muted-foreground p-4">暂无 memory spaces</div>
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
                    <TableCell className="font-mono text-xs">{String(space.id).substring(0, 8)}</TableCell>
                    <TableCell>{escapeHtml(String(space.space_key))}</TableCell>
                    <TableCell>{escapeHtml(String(space.space_type))}</TableCell>
                    <TableCell>{escapeHtml(String(space.title))}</TableCell>
                    <TableCell className="max-w-xs truncate" title={escapeHtml(String(space.summary ?? ''))}>
                      {escapeHtml(String(space.summary ?? '').substring(0, 80))}
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
          <CardDescription>当前选中空间的记忆列表</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedSpaceId && items?.items.length !== 0 && (
            <div className="text-muted-foreground p-4">请从上方选择一个空间查看其条目</div>
          )}
          {loadingItems ? (
            <div className="text-muted-foreground p-4">加载条目中...</div>
          ) : !items?.items || items.items.length === 0 ? (
            <div className="text-muted-foreground p-4">暂无 memory items</div>
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
                    <TableCell className="font-mono text-xs">{String(item.id).substring(0, 8)}</TableCell>
                    <TableCell className="font-mono text-xs">{String(item.space_id).substring(0, 8)}</TableCell>
                    <TableCell>{escapeHtml(String(item.item_key))}</TableCell>
                    <TableCell>{escapeHtml(String(item.content_type))}</TableCell>
                    <TableCell>{escapeHtml(String(item.source))}</TableCell>
                    <TableCell className="max-w-lg truncate" title={escapeHtml(String(item.content ?? ''))}>
                      {escapeHtml(String(item.content ?? '').substring(0, 100))}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="destructive" onClick={() => deleteItemMutation.mutate({ spaceId: Number(item.space_id), itemId: Number(item.id) })} disabled={deleteItemMutation.isPending}>
                        {deleteItemMutation.isPending ? '删除中...' : '删除'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
