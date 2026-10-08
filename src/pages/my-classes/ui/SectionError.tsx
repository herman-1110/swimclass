import { messageFor } from '@/shared/config/messages'
import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import type { ReadFailure } from '@/shared/lib/hooks/useReadFailure'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'

import { myClassesPageWords } from '../model/words'

type SectionErrorProps = {
  /** Why the section couldn't be read (an AppError), kept while "Try again" reads it again:
   *  the button keeps its place and focus, and waits. */
  failure: ReadFailure
}

/**
 * A section that couldn't load (my-classes spec §6, not drawn): in place of its rows, the
 * kit Banner with the DESIGN §6 words and a quiet accent "Try again" at its right, the way
 * every screen shows a failed read. The section's heading stays.
 */
export function SectionError({ failure }: SectionErrorProps) {
  const language = useLanguage()
  return (
    <Banner
      className="mt-2 mb-3"
      action={
        <Button
          variant="quiet"
          size="sm"
          tone="accent"
          pending={failure.retrying}
          onClick={failure.retry}
        >
          {wordsIn(myClassesPageWords, language).tryAgain}
        </Button>
      }
    >
      {/* A new alert for each failure: one that fails again is read out again. The button
          stays, so it keeps focus. */}
      <p key={failure.failedAt} role="alert">
        {messageFor(failure.error, { language })}
      </p>
    </Banner>
  )
}
