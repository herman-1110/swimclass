import { useEffect, useRef, useState } from 'react'

import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Textarea } from '@/shared/ui/Textarea'

import { useRefreshLessons } from '../api/refreshLessons'
import { useCancelLesson } from '../api/useCancelLesson'
import { cancelDescription, cancelledNotice, cancelTitle, reasonHelp } from '../model/copy'
import { cancelErrorOutcome, refreshesAfter } from '../model/errorOutcome'
import type { CancelableLesson, CancelAudience } from '../model/types'
import { cancelLessonWords } from '../model/words'

/** The limit `cancel_booking` checks (`invalid_reason`). */
const REASON_MAX_LENGTH = 500

export type CancelLessonConfirmProps = {
  onClose: () => void
  lesson: CancelableLesson
  audience: CancelAudience
  cutoffHours?: number | null
  onCancelled: (notice: string) => void
}

/**
 * The open cancel confirmation (the My classes spec §2.6 and §5.4; the Schedule spec §7.4).
 * Mounted only while open, so every opening starts fresh.
 */
export function CancelLessonConfirm({
  onClose,
  lesson,
  audience,
  cutoffHours,
  onCancelled,
}: CancelLessonConfirmProps) {
  // The coach cancels under CoachLayout, which keeps it English.
  const language = useLanguage()
  const w = wordsIn(cancelLessonWords, language)
  const keep = useRef<HTMLButtonElement>(null)
  const reasonBox = useRef<HTMLTextAreaElement>(null)
  const [reason, setReason] = useState('')
  const refresh = useRefreshLessons()
  const cancel = useCancelLesson({
    onCancelled: () => onCancelled(cancelledNotice(lesson, audience, language)),
  })
  const outcome = cancel.isError
    ? cancelErrorOutcome(cancel.error, { audience, cutoffHours, language })
    : null
  // Nothing more to try: "Cancel lesson" goes and "Keep lesson" reads "Close".
  const final = outcome !== null && !outcome.canRetry
  const reasonError = outcome?.field === 'reason'

  // The focused "Cancel lesson" goes away after a final refusal: keep focus in the dialog.
  // A reason that is too long: focus goes to it, with its message.
  useEffect(() => {
    if (final) keep.current?.focus()
    else if (reasonError) reasonBox.current?.focus()
  }, [final, reasonError])

  const close = () => {
    // Refresh once the person has read why (the row may go when the lists refresh).
    if (cancel.isError && refreshesAfter(cancel.error)) void refresh(cancel.error)
    onClose()
  }

  return (
    <Dialog
      open
      onClose={close}
      role="alertdialog"
      size="sm"
      hideClose
      busy={cancel.isPending}
      initialFocus={keep}
      title={cancelTitle(lesson, language)}
      description={cancelDescription(audience, language)}
      actions={
        <>
          {!final && (
            <Button
              className="flex-1"
              pending={cancel.isPending}
              aria-disabled={cancel.isPending || undefined}
              onClick={() =>
                cancel.mutate({
                  bookingId: lesson.booking_id,
                  reason: audience === 'coach' ? reason : undefined,
                })
              }
            >
              {cancel.isPending ? w.cancelling : w.cancelLesson}
            </Button>
          )}
          <Button
            ref={keep}
            variant="quiet"
            tone="muted"
            aria-disabled={cancel.isPending || undefined}
            onClick={close}
          >
            {final ? w.close : w.keepLesson}
          </Button>
        </>
      }
    >
      {audience === 'coach' && (
        <Textarea
          ref={reasonBox}
          label="Reason (optional)"
          rows={3}
          maxLength={REASON_MAX_LENGTH}
          help={reasonHelp(lesson)}
          value={reason}
          readOnly={cancel.isPending}
          error={reasonError ? outcome.message : undefined}
          onChange={(event) => setReason(event.target.value)}
        />
      )}
      {outcome && outcome.field === null && (
        <p role="alert" className="text-label leading-normal text-warn">
          {outcome.message}
        </p>
      )}
    </Dialog>
  )
}
