import { Link } from 'react-router-dom'
import { Network } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

export function GatewayPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">网关</h1>
      <EmptyState
        icon={Network}
        title="网关管理功能建设中"
        description="该模块尚未上线。上线后将展示网关事件流与转发配置，用于排查消息进出链路的问题。"
        action={
          <Button asChild variant="outline">
            <Link to="/">返回仪表盘</Link>
          </Button>
        }
      />
    </div>
  )
}
