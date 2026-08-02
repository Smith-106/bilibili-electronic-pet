import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

export function ProfilesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">风格配置</h1>
      <EmptyState
        icon={Settings}
        title="风格配置功能建设中"
        description="该模块尚未上线。上线后将管理回复风格档案（语气、措辞偏好）。在此之前，可通过角色卡定义回复行为。"
        action={
          <Button asChild variant="outline">
            <Link to="/role-cards">前往角色卡管理</Link>
          </Button>
        }
      />
    </div>
  )
}
