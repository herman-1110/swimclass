import { messageFor } from '@/shared/config/messages'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'

type RetryMessageProps = {
  /** What failed: its words come from messages.ts (network or generic). */
  error: unknown
  onRetry: () => void
  /** Layout only (margins). */
  className?: string
}

/**
 * A read that failed (book spec §6.3, proposed). Every screen shows a failed read the same
 * way, as the coach's pages do: the kit Banner with the DESIGN §6 words and a quiet accent
 * "Try again" at its right that reads it again. The words are the alert, so they are read
 * out without the button's name.
 */
export function RetryMessage({ error, onRetry, className }: RetryMessageProps) {
  return (
    <Banner
      className={className}
      action={
        <Button variant="quiet" size="sm" tone="accent" onClick={onRetry}>
          Try again
        </Button>
      }
    >
      <p role="alert">{messageFor(error)}</p>
    </Banner>
  )
}
