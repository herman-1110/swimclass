import { useId } from 'react'

import type { CoachException } from '@/entities/schedule'
import { messageFor } from '@/shared/config/messages'
import { Button } from '@/shared/ui/Button'

import { useRemoveException } from '../api/useRemoveException'
import { removedNotice, removeExceptionName } from '../model/copy'

type RemoveExceptionButtonProps = {
  /** A Block time or Open extra time of the week shown (coach_week's exceptions). */
  exception: CoachException
  /** Removed: show this notice ("Blocked time removed.", "Extra time removed."). The row
   *  then leaves the list when the week refreshes. */
  onRemoved?: (notice: string) => void
}

/**
 * "Remove" in the week's "Blocked and extra time" list (the Schedule spec §3.8, §7.4): at
 * once, no confirmation; the weekly hours apply again. Its name says which ("Remove blocked
 * time, Sat 3 Oct, 7:00–9:00 am"). While the call runs it keeps its label and focus and
 * looks disabled; a refusal shows under it.
 */
export function RemoveExceptionButton({ exception, onRemoved }: RemoveExceptionButtonProps) {
  const errorId = useId()
  const remove = useRemoveException({
    onRemoved: () => onRemoved?.(removedNotice(exception.kind)),
  })

  return (
    <span className="inline-flex shrink-0 flex-col items-end gap-1">
      <Button
        variant="link"
        textSize="label"
        className="whitespace-nowrap"
        pending={remove.isPending}
        aria-disabled={remove.isPending || undefined}
        aria-describedby={remove.isError ? errorId : undefined}
        onClick={() => remove.mutate({ id: exception.id })}
      >
        {/* The space stays outside the hidden part, so every browser keeps it in the name. */}
        <span>
          Remove <span className="sr-only">{removeExceptionName(exception)}</span>
        </span>
      </Button>
      {remove.isError && (
        <span
          id={errorId}
          role="alert"
          className="max-w-64 text-right text-label leading-normal text-warn"
        >
          {messageFor(remove.error, { audience: 'coach' })}
        </span>
      )}
    </span>
  )
}
