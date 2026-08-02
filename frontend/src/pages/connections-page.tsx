import { createAdminApi } from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BoolBadge } from '@/components/status-badge'
import { toast } from 'sonner'
import { toastMutationError } from '@/lib/feedback'
import { Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const api = createAdminApi()

interface PlatformConnection {
  platform: string
  enabled: boolean
}

export function ConnectionsPage() {
  const queryClient = useQueryClient()

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
    onError: (err, vars) =>
      toastMutationError(`操作失败：${err.message}`, {
        retry: () => toggleMutation.mutate(vars),
      }),
  })

  if (isLoading) return <div className="p-6 text-muted-foreground">加载平台连接...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">平台连接</h1>

      <Card>
        <CardHeader>
          <CardTitle>平台状态</CardTitle>
          <CardDescription>直接在对应平台行上开启或关闭连接</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>平台</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platforms?.items.map(p => {
                  const rowPending = toggleMutation.isPending && toggleMutation.variables?.platform === p.platform
                  return (
                    <TableRow key={p.platform}>
                      <TableCell className="font-medium">{p.platform}</TableCell>
                      <TableCell>
                        <BoolBadge value={p.enabled} trueLabel="开启" falseLabel="关闭" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={p.enabled ? 'outline' : 'default'}
                          disabled={toggleMutation.isPending}
                          aria-busy={rowPending}
                          onClick={() => toggleMutation.mutate({ platform: p.platform, enabled: !p.enabled })}
                        >
                          {rowPending && <Loader2 className="animate-spin" aria-hidden="true" />}
                          {rowPending ? '处理中...' : p.enabled ? '关闭' : '开启'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
