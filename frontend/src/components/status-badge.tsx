import { Badge } from '@/components/ui/badge'

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  published: { label: '已发布', variant: 'default' },
  failed: { label: '失败', variant: 'destructive' },
  queued: { label: '排队中', variant: 'secondary' },
  pending_review: { label: '待审核', variant: 'secondary' },
  approved: { label: '已审批', variant: 'default' },
  retrying: { label: '重试中', variant: 'outline' },
  skipped: { label: '已跳过', variant: 'secondary' },
  processing: { label: '处理中', variant: 'outline' },
  pending: { label: '待处理', variant: 'secondary' },
}

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  queued: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  retrying: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  skipped: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null
  const info = STATUS_MAP[status] || { label: status, variant: 'secondary' as const }
  const colorCls = STATUS_COLORS[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'

  return (
    <Badge variant={info.variant} className={colorCls}>
      {info.label}
    </Badge>
  )
}

export function BoolBadge({ value, trueLabel = '是', falseLabel = '否' }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  const label = value ? trueLabel : falseLabel
  const colorCls = value
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'

  return (
    <Badge variant={value ? 'default' : 'secondary'} className={colorCls}>
      {label}
    </Badge>
  )
}
