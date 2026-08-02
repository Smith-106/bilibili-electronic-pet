import { Link } from 'react-router-dom'
import { Filter } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

export function QueryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">查询</h1>
      <EmptyState
        icon={Filter}
        title="高级查询功能建设中"
        description="该模块尚未上线。上线后将支持按条件组合检索评论与任务。在此之前，可在任务管理页按状态筛选。"
        action={
          <Button asChild variant="outline">
            <Link to="/jobs">前往任务管理</Link>
          </Button>
        }
      />
    </div>
  )
}
