import { messageFor } from '@/shared/config/messages'
import type { ReadFailure } from '@/shared/lib/hooks/useReadFailure'
import { Button } from '@/shared/ui/Button'

type SectionErrorProps = {
  /** Why the section couldn't be read (an AppError), kept while "Try again" reads it again:
   *  the button keeps its place and focus, and waits. */
  failure: ReadFailure
}

/**
 * A section that couldn't load (my-classes spec §6, not drawn): in place of its rows, the
 * DESIGN §6 words in 13 px orange and a quiet "Try again". The section's heading stays.
 */
export function SectionError({ failure }: SectionErrorProps) {
  return (
    <div className="flex flex-col items-start gap-1 py-4">
      {/* A new alert for each failure: one that fails again is read out again. */}
      <p key={failure.failedAt} role="alert" className="text-label leading-normal text-warn">
        {messageFor(failure.error)}
      </p>
      <Button
        variant="quiet"
        size="sm"
        tone="accent"
        // The quiet button's own padding: line its text up with the message's.
        className="-ml-3.5"
        pending={failure.retrying}
        onClick={failure.retry}
      >
        Try again
      </Button>
    </div>
  )
}
