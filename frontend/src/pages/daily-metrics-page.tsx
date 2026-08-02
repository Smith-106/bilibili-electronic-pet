import { Link } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

export function DailyMetricsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">每日指标</h1>
      <EmptyState
        icon={BarChart3}
        title="每日指标功能建设中"
        description="该模块尚未上线。上线后将按天汇总评论处理量、发布成功率等核心指标，帮助评估自动化流水线的健康度。"
        action={
          <Button asChild variant="outline">
            <Link to="/">返回仪表盘</Link>
          </Button>
        }
      />
    </div>
  )
}
