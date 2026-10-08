import { useState } from 'react'

import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import { Button } from '@/shared/ui/Button'

import { cancelState } from '../model/cancelWindow'
import { cancelLabel } from '../model/copy'
import type { CancelableLesson } from '../model/types'
import { cancelLessonWords } from '../model/words'
import { CancelLessonDialog } from './CancelLessonDialog'

type CancelLessonButtonProps = {
  lesson: CancelableLesson
  /** `cancel_cutoff_hours` from settings: the deadline, and the `locked` message. */
  cutoffHours: number
  /** Now (the page's clock, `nowMyt()`/`useNow`): "Cancel" shows until the deadline. */
  now: Date
  /** The id of the row's note (`cancelNote`), so the button reads out its deadline (BR-15). */
  describedBy?: string
  /** The lesson is cancelled: show this as the page's status message and move focus to it. */
  onCancelled: (notice: string) => void
}

/**
 * The right side of an upcoming lesson on My classes (MyClasses.dc.html): "Cancel", which
 * opens the confirmation, while the lesson can still be cancelled, and "Locked" after the
 * deadline or once it has started. The note under the row is `cancelNote`. A preview: the
 * database has the final say (`locked`).
 */
export function CancelLessonButton({
  lesson,
  cutoffHours,
  now,
  describedBy,
  onCancelled,
}: CancelLessonButtonProps) {
  const language = useLanguage()
  const w = wordsIn(cancelLessonWords, language)
  const [open, setOpen] = useState(false)
  const state = cancelState(lesson.starts_at, cutoffHours, now)

  return (
    <>
      {state === 'open' ? (
        <Button
          variant="link"
          className="shrink-0"
          aria-label={cancelLabel(lesson, language)}
          aria-describedby={describedBy}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          {w.cancel}
        </Button>
      ) : (
        <span className="text-label whitespace-nowrap text-muted">{w.locked}</span>
      )}
      {/* Stays open if the deadline passes meanwhile: the database answers `locked` then. */}
      <CancelLessonDialog
        open={open}
        onClose={() => setOpen(false)}
        lesson={lesson}
        audience="customer"
        cutoffHours={cutoffHours}
        onCancelled={(notice) => {
          setOpen(false)
          onCancelled(notice)
        }}
      />
    </>
  )
}
