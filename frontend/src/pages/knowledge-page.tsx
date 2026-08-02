import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

export function KnowledgePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">知识库</h1>
      <EmptyState
        icon={BookOpen}
        title="知识库功能建设中"
        description="该模块尚未上线。上线后将管理宠物回答所依赖的知识条目与引用来源。在此之前，可通过 Memory 管理维护记忆数据。"
        action={
          <Button asChild variant="outline">
            <Link to="/memory">前往 Memory 管理</Link>
          </Button>
        }
      />
    </div>
  )
}
