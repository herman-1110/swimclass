import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { accountKeys } from '@/entities/account'
import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'
import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import type { ReadFailure } from '@/shared/lib/hooks/useReadFailure'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'

import { schedulePageWords } from '../model/words'

type WeekErrorProps = {
  /** Why the week couldn't be read (an AppError), kept while "Try again" reads it again:
   *  the button keeps its place and focus, and waits. */
  failure: ReadFailure
}

/**
 * The timetable's error (customer-schedule §6.3, not drawn), over the empty grid: the kit
 * Banner with the DESIGN §6 words for what went wrong, the way every screen shows a failed
 * read, and a quiet accent "Try again" at its right when trying again can help (the server
 * was out of reach, or something unexpected). An account that is no longer approved gets
 * its profile read again, so the guard sends it to Waiting for approval.
 */
export function WeekError({ failure }: WeekErrorProps) {
  const language = useLanguage()
  const queryClient = useQueryClient()
  const code = toAppError(failure.error).code

  useEffect(() => {
    if (code === 'not_approved') void queryClient.invalidateQueries({ queryKey: accountKeys.all })
  }, [code, queryClient])

  return (
    <Banner
      className="m-2"
      action={
        (code === 'network' || code === 'unknown') && (
          <Button
            variant="quiet"
            size="sm"
            tone="accent"
            pending={failure.retrying}
            onClick={failure.retry}
          >
            {wordsIn(schedulePageWords, language).tryAgain}
          </Button>
        )
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
