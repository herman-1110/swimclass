import { messageFor } from '@/shared/config/messages'
import type { ReadFailure } from '@/shared/lib/hooks/useReadFailure'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'

type ReadErrorProps = {
  /** The read that never loaded (useReadFailure): its words come from messages.ts. */
  failure: ReadFailure
  /** Layout only. */
  className?: string
}

/**
 * A read the form needs that failed (the spec §6): DESIGN §6's words and "Try again". While
 * the read runs again the message stays and the button keeps its place and focus, busy;
 * useReadFailure then hands focus to the Account select.
 */
export function ReadError({ failure, className }: ReadErrorProps) {
  return (
    <Banner
      role="alert"
      className={className}
      action={
        <Button variant="link" pending={failure.retrying} onClick={failure.retry}>
          Try again
        </Button>
      }
    >
      {/* A new text node for each failure, so one that fails again is read out again. */}
      <span key={failure.failedAt}>{messageFor(failure.error, { audience: 'coach' })}</span>
    </Banner>
  )
}
