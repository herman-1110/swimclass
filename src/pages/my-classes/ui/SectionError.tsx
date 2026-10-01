import { messageFor } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'

type SectionErrorProps = {
  /** The failed read's error (an AppError). */
  error: unknown
  /** The read is running again: "Try again" keeps its place and focus, and waits. */
  retrying: boolean
  onRetry: () => void
}

/**
 * A section that couldn't load (my-classes spec §6, not drawn): in place of its rows, the
 * DESIGN §6 words in 13 px orange and a quiet "Try again". The section's heading stays.
 */
export function SectionError({ error, retrying, onRetry }: SectionErrorProps) {
  return (
    <div className="flex flex-col items-start gap-1 py-4">
      <p role="alert" className="text-label leading-normal text-warn">
        {messageFor(error)}
      </p>
      <Button
        variant="quiet"
        size="sm"
        tone="accent"
        // The quiet button's own padding: line its text up with the message's.
        className="-ml-3.5"
        pending={retrying}
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  )
}
