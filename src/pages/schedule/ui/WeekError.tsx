import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { accountKeys } from '@/entities/account'
import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'
import type { ReadFailure } from '@/shared/lib/hooks/useReadFailure'
import { Button } from '@/shared/ui/Button'

type WeekErrorProps = {
  /** Why the week couldn't be read (an AppError), kept while "Try again" reads it again:
   *  the button keeps its place and focus, and waits. */
  failure: ReadFailure
}

/**
 * The timetable's error panel (customer-schedule §6.3, not drawn): over the empty grid, the
 * DESIGN §6 words for what went wrong in 14 px ink, and "Try again" when trying again can
 * help (the server was out of reach, or something unexpected). An account that is no longer
 * approved gets its profile read again, so the guard sends it to Waiting for approval.
 */
export function WeekError({ failure }: WeekErrorProps) {
  const queryClient = useQueryClient()
  const code = toAppError(failure.error).code

  useEffect(() => {
    if (code === 'not_approved') void queryClient.invalidateQueries({ queryKey: accountKeys.all })
  }, [code, queryClient])

  return (
    <div className="m-2 flex flex-col items-start gap-1 rounded-control border border-line bg-white px-3.5 py-3">
      {/* A new alert for each failure: one that fails again is read out again. */}
      <p key={failure.failedAt} role="alert" className="text-sm leading-normal text-ink">
        {messageFor(failure.error)}
      </p>
      {(code === 'network' || code === 'unknown') && (
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
      )}
    </div>
  )
}
