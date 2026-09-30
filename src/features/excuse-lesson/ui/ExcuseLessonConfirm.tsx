import { useEffect, useRef } from 'react'

import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'

import { useExcuseLesson, useRefreshAfterExcuse } from '../api/useExcuseLesson'
import { EXCUSE_DESCRIPTION, EXCUSED_NOTICE, excuseTitle } from '../model/copy'
import { excuseErrorOutcome, refreshesAfter } from '../model/errorOutcome'
import type { ExcuseCandidate } from '../model/types'

type ExcuseLessonConfirmProps = {
  lesson: ExcuseCandidate
  onClose: () => void
  onExcused: (notice: string) => void
}

/**
 * The open "Mark as excused" confirmation (the Schedule spec §7.4, proposed): mounted only
 * while open, so every opening starts fresh.
 */
export function ExcuseLessonConfirm({ lesson, onClose, onExcused }: ExcuseLessonConfirmProps) {
  const keep = useRef<HTMLButtonElement>(null)
  const refresh = useRefreshAfterExcuse()
  const excuse = useExcuseLesson({ onExcused: () => onExcused(EXCUSED_NOTICE) })
  const outcome = excuse.isError ? excuseErrorOutcome(excuse.error) : null
  // Nothing more to try: "Mark as excused" goes and "Keep lesson" reads "Close".
  const final = outcome !== null && !outcome.canRetry

  // The focused "Mark as excused" goes away after a final refusal: keep focus in the dialog.
  useEffect(() => {
    if (final) keep.current?.focus()
  }, [final])

  const close = () => {
    if (excuse.isError && refreshesAfter(excuse.error)) void refresh()
    onClose()
  }

  return (
    <Dialog
      open
      onClose={close}
      role="alertdialog"
      size="sm"
      hideClose
      busy={excuse.isPending}
      initialFocus={keep}
      title={excuseTitle(lesson)}
      description={EXCUSE_DESCRIPTION}
      actions={
        <>
          {!final && (
            <Button
              className="flex-1"
              pending={excuse.isPending}
              aria-disabled={excuse.isPending || undefined}
              onClick={() => excuse.mutate({ bookingId: lesson.booking_id })}
            >
              Mark as excused
            </Button>
          )}
          <Button
            ref={keep}
            variant="quiet"
            tone="muted"
            aria-disabled={excuse.isPending || undefined}
            onClick={close}
          >
            {final ? 'Close' : 'Keep lesson'}
          </Button>
        </>
      }
    >
      {outcome && (
        <p role="alert" className="text-label leading-normal text-warn">
          {outcome.message}
        </p>
      )}
    </Dialog>
  )
}
