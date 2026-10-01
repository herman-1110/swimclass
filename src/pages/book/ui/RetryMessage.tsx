import { messageFor } from '@/shared/config/messages'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'

type RetryMessageProps = {
  /** What failed: its words come from messages.ts (network or generic). */
  error: unknown
  onRetry: () => void
  /** Layout only. */
  className?: string
}

/**
 * A read that failed (book spec §6.3, proposed): the message in 14 px ink and a quiet
 * "Try again" that reads it again.
 */
export function RetryMessage({ error, onRetry, className }: RetryMessageProps) {
  return (
    <div className={cn('flex flex-col items-start gap-1', className)}>
      <p role="alert" className="text-sm leading-normal text-ink">
        {messageFor(error)}
      </p>
      <Button variant="quiet" className="-ml-3.5" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
