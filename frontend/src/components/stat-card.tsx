import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  color?: string
  className?: string
  valueClassName?: string
}

export function StatCard({ label, value, hint, color, className, valueClassName }: StatCardProps) {
  return (
    <Card className={cn('shadow-none', className)}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={cn('text-xl font-bold mt-1', color, valueClassName)}>{value}</div>
        {hint && <div className="text-sm text-muted-foreground mt-1 md:text-xs">{hint}</div>}
      </CardContent>
    </Card>
  )
}
