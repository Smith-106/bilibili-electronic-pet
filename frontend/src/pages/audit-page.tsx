import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

export function AuditPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">审计日志</h1>
      <EmptyState
        icon={Search}
        title="审计日志功能建设中"
        description="该模块尚未上线。上线后将记录管理面板的关键操作（审批、删除、配置变更），便于回溯与合规审查。"
        action={
          <Button asChild variant="outline">
            <Link to="/">返回仪表盘</Link>
          </Button>
        }
      />
    </div>
  )
}
