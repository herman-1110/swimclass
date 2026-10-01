import { messageFor } from '@/shared/config/messages'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'

type LoadErrorProps = {
  /** The read's failure: its words come from messages.ts (DESIGN §6). */
  error: unknown
  onRetry: () => void
  /** Layout only (margins). */
  className?: string
}

/**
 * A read that failed, in place of what it would show (coach-students §6): the network or
 * generic message, and "Try again".
 */
export function LoadError({ error, onRetry, className }: LoadErrorProps) {
  return (
    <Banner
      role="alert"
      className={className}
      action={
        <Button variant="link" textSize="label" onClick={onRetry}>
          Try again
        </Button>
      }
    >
      {messageFor(error, { audience: 'coach' })}
    </Banner>
  )
}
