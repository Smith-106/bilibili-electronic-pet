import { Skeleton } from '@/components/ui/skeleton'

interface TableSkeletonProps {
  /** 占位行数，默认 5 */
  rows?: number
  /** 列数，默认 5 */
  columns?: number
}

/**
 * 表格页统一加载占位。替代 <div>加载...</div> 纯文本。
 * 容器自带 aria-busy + role="status" + sr-only 文案。
 */
export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div aria-busy="true" role="status" className="space-y-3 py-4">
      <span className="sr-only">加载中</span>
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  )
}
