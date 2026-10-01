import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { accountKeys } from '@/entities/account'
import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'

type WeekErrorProps = {
  /** useCustomerWeek(…).error: an AppError. */
  error: unknown
  /** The week is being read again: "Try again" keeps its place and focus, and waits. */
  retrying: boolean
  onRetry: () => void
}

/**
 * The timetable's error panel (customer-schedule §6.3, not drawn): over the empty grid, the
 * DESIGN §6 words for what went wrong in 14 px ink, and "Try again" when trying again can
 * help (the server was out of reach, or something unexpected). An account that is no longer
 * approved gets its profile read again, so the guard sends it to Waiting for approval.
 */
export function WeekError({ error, retrying, onRetry }: WeekErrorProps) {
  const queryClient = useQueryClient()
  const code = toAppError(error).code

  useEffect(() => {
    if (code === 'not_approved') void queryClient.invalidateQueries({ queryKey: accountKeys.all })
  }, [code, queryClient])

  return (
    <div className="m-2 flex flex-col items-start gap-1 rounded-control border border-line bg-white px-3.5 py-3">
      <p role="alert" className="text-sm leading-normal text-ink">
        {messageFor(error)}
      </p>
      {(code === 'network' || code === 'unknown') && (
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
      )}
    </div>
  )
}
