import { formatIsoDateTime, timeAgo } from '@/lib/utils'

export function Timestamp({ value }: { value: string | null | undefined }) {
  const ago = timeAgo(value)
  const full = formatIsoDateTime(value)

  if (!ago) return <span className="text-muted-foreground">{full}</span>
  return (
    <span className="text-muted-foreground" title={full}>
      {ago}
    </span>
  )
}
