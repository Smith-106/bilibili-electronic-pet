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

/* Colors come from the --badge-* token layer in index.css (all 3 themes
   redefine them, AA-compliant). No hardcoded palette, no dark: variants —
   the token layer handles light/dark/sepia. */
const STATUS_COLORS: Record<string, string> = {
  published: 'bg-badge-success-bg text-badge-success-fg',
  failed: 'bg-badge-danger-bg text-badge-danger-fg',
  queued: 'bg-badge-warning-bg text-badge-warning-fg',
  pending_review: 'bg-badge-warning-bg text-badge-warning-fg',
  approved: 'bg-badge-success-bg text-badge-success-fg',
  retrying: 'bg-badge-info-bg text-badge-info-fg',
  skipped: 'bg-badge-muted-bg text-badge-muted-fg',
  processing: 'bg-badge-info-bg text-badge-info-fg',
  pending: 'bg-badge-warning-bg text-badge-warning-fg',
}

const MUTED_COLORS = 'bg-badge-muted-bg text-badge-muted-fg'

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null
  const info = STATUS_MAP[status] || { label: status, variant: 'secondary' as const }
  const colorCls = STATUS_COLORS[status] || MUTED_COLORS

  return (
    <Badge variant={info.variant} className={colorCls}>
      {info.label}
    </Badge>
  )
}

export function BoolBadge({ value, trueLabel = '是', falseLabel = '否' }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  const label = value ? trueLabel : falseLabel
  // On/off are visually distinct: success tint vs muted tint (was identical grays)
  const colorCls = value
    ? 'bg-badge-success-bg text-badge-success-fg'
    : MUTED_COLORS

  return (
    <Badge variant={value ? 'default' : 'secondary'} className={colorCls}>
      {label}
    </Badge>
  )
}
