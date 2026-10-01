import { messageFor } from '@/shared/config/messages'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'

type LoadErrorProps = {
  /** The failed read's error (an AppError). */
  error: unknown
  /** Reads it again. */
  onRetry: () => void
}

/**
 * A read that failed, in place of what it would show (the Schedule spec §6.1, §6.2): the
 * network or generic words (DESIGN §6) and a quiet "Try again".
 */
export function LoadError({ error, onRetry }: LoadErrorProps) {
  return (
    <Banner
      role="alert"
      action={
        <Button variant="quiet" size="sm" tone="accent" onClick={onRetry}>
          Try again
        </Button>
      }
    >
      {messageFor(error, { audience: 'coach' })}
    </Banner>
  )
}
