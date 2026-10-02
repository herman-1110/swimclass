import { messageFor } from '@/shared/config/messages'
import type { ReadFailure } from '@/shared/lib/hooks/useReadFailure'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'

type LoadErrorProps = {
  /** The read that failed (useReadFailure): its words come from messages.ts (DESIGN §6). */
  failure: ReadFailure
  /** Layout only (margins). */
  className?: string
}

/**
 * A read that failed, in place of what it would show (coach-students §6): the network or
 * generic message, and "Try again". While the read runs again the message stays, and the
 * button keeps its place and focus, busy; useReadFailure then hands focus on to what
 * replaces it.
 */
export function LoadError({ failure, className }: LoadErrorProps) {
  return (
    <Banner
      role="alert"
      className={className}
      action={
        <Button variant="link" textSize="label" pending={failure.retrying} onClick={failure.retry}>
          Try again
        </Button>
      }
    >
      {/* A new text node for each failure, so one that fails again is read out again. */}
      <span key={failure.failedAt}>{messageFor(failure.error, { audience: 'coach' })}</span>
    </Banner>
  )
}
