import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  /** Optional CTA element (e.g. a Button or link) rendered below the copy */
  action?: ReactNode
  className?: string
}

/**
 * Honest empty state: acknowledge + explain + action.
 * Replaces the "eternal skeleton" stub pattern (RC-STUBS).
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-start gap-3 py-16 pl-2', className)}>
      <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-[52ch] text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
