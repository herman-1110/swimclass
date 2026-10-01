import { messageFor } from '@/shared/config/messages'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'

type SettingsLoadErrorProps = {
  /** Why the settings or the hours didn't load. */
  error: unknown
  /** Reads both again. */
  onRetry: () => void
}

/**
 * In place of the sections when the settings or hours can't be read (coach-settings §6.3,
 * proposed): DESIGN §6's words ("Couldn’t reach the server…" or the generic message, which a
 * customer who got here would also see) and "Try again".
 */
export function SettingsLoadError({ error, onRetry }: SettingsLoadErrorProps) {
  return (
    <Banner
      role="alert"
      className="md:max-w-[760px]"
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
