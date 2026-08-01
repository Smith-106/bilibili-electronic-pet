import { Skeleton } from '@/components/ui/skeleton'

export function AuditPage() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[40px] w-[200px]" />
      <Skeleton className="h-[100px] w-full" />
      <Skeleton className="h-[200px] w-full" />
    </div>
  )
}
