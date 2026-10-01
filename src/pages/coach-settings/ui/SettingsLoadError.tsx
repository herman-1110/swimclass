import { messageFor } from '@/shared/config/messages'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'

type SettingsLoadErrorProps = {
  /** Why the settings or the hours didn't load. */
  error: unknown
  /** How many times the reads have failed: each new failure is read out again. */
  failures: number
  /** The reads are running again: "Try again" keeps focus and ignores presses meanwhile. */
  retrying: boolean
  /** Reads both again. */
  onRetry: () => void
}

/**
 * In place of the sections when the settings or hours can't be read (coach-settings §6.3,
 * proposed): DESIGN §6's words ("Couldn’t reach the server…" or the generic message, which a
 * customer who got here would also see) and "Try again". It stays while the reads run again,
 * so the button keeps focus.
 */
export function SettingsLoadError({ error, failures, retrying, onRetry }: SettingsLoadErrorProps) {
  return (
    <Banner
      role="alert"
      className="md:max-w-[760px]"
      action={
        <Button variant="link" textSize="label" pending={retrying} onClick={onRetry}>
          Try again
        </Button>
      }
    >
      {/* A new text node for each failure, so the alert is announced again. */}
      <span key={failures}>{messageFor(error, { audience: 'coach' })}</span>
    </Banner>
  )
}
