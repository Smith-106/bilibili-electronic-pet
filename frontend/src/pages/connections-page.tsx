import { useState } from 'react'
import { createAdminApi } from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const api = createAdminApi()

interface PlatformConnection {
  platform: string
  enabled: boolean
}

export function ConnectionsPage() {
  const queryClient = useQueryClient()
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [enabled, setEnabled] = useState(false)

  const { data: platforms, isLoading } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => api.getPlatformConnections() as Promise<{ items: PlatformConnection[] }>,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ platform, enabled }: { platform: string; enabled: boolean }) =>
      api.setPlatformConnectionControl(platform, enabled),
    onSuccess: () => {
      toast.success('平台连接状态已更新')
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
    },
    onError: (err) => {
      toast.error(`操作失败：${err.message}`)
    },
  })

  if (isLoading) return <div className="p-6">加载中...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">平台连接</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>切换平台状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger><SelectValue placeholder="选择平台" /></SelectTrigger>
              <SelectContent>
                {platforms?.items.map(p => <SelectItem key={p.platform} value={p.platform}>{p.platform}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <Button onClick={() => selectedPlatform && toggleMutation.mutate({ platform: selectedPlatform, enabled })} disabled={toggleMutation.isPending}>
              {toggleMutation.isPending ? '处理中...' : '应用'}
            </Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>平台</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platforms?.items.map(p => (
                <TableRow key={p.platform}>
                  <TableCell>{p.platform}</TableCell>
                  <TableCell>
                    <Badge variant={p.enabled ? 'secondary' : 'secondary'}>{p.enabled ? '开启' : '关闭'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant={p.enabled ? 'outline' : 'default'} onClick={() => toggleMutation.mutate({ platform: p.platform, enabled: !p.enabled })}>
                      {p.enabled ? '关闭' : '开启'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// Fallback components for missing shadcn imports
function Select({ children, value, onValueChange }: any) {
  return <select value={value} onChange={(e: any) => onValueChange(e.target.value)} className="border rounded px-2 py-1">{children}</select>
}
function SelectTrigger({ children }: any) { return <div>{children}</div> }
function SelectValue({ placeholder }: any) { return <span>{placeholder}</span> }
function SelectContent({ children }: any) { return <div>{children}</div> }
function SelectItem({ children, value }: any) { return <option value={value}>{children}</option> }
function Badge({ variant, children }: any) {
  const styles = variant === 'success' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  return <span className={`px-2 py-1 rounded ${styles}`}>{children}</span>
}
