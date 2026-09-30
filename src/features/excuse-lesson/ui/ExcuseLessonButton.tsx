import { useState } from 'react'

import { Button } from '@/shared/ui/Button'

import { ENDED_HINT, hasEnded, hasStarted, NOT_STARTED_HINT } from '../model/copy'
import type { ExcuseCandidate } from '../model/types'
import { ExcuseLessonConfirm } from './ExcuseLessonConfirm'

type ExcuseLessonButtonProps = {
  /** The lesson in the details (a coach_week lesson). */
  lesson: ExcuseCandidate
  /** Now (the page's clock, `nowMyt()`): the button shows only once the lesson has started. */
  now: Date
  /** It is excused: close the lesson details and show this notice ("Lesson marked as
   *  excused. It no longer counts."). */
  onExcused: (notice: string) => void
}

/**
 * "Mark as excused" in the coach's lesson details (DESIGN §4: only once the lesson has
 * started; a future lesson is cancelled instead), with its own confirmation. Before the
 * start it says "You can mark it as excused once it has started." instead, and once the
 * lesson is over it adds "This lesson has already happened. If it shouldn’t count, mark it
 * as excused instead of cancelling." (the Schedule spec §6.6). Put it in a column.
 */
export function ExcuseLessonButton({ lesson, now, onExcused }: ExcuseLessonButtonProps) {
  const [open, setOpen] = useState(false)

  if (!hasStarted(lesson, now)) {
    return <p className="text-small leading-[1.4] text-muted">{NOT_STARTED_HINT}</p>
  }

  return (
    <>
      <Button variant="link" flush aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Mark as excused
      </Button>
      {hasEnded(lesson, now) && <p className="text-small leading-[1.4] text-muted">{ENDED_HINT}</p>}
      {open && (
        <ExcuseLessonConfirm
          lesson={lesson}
          onClose={() => setOpen(false)}
          onExcused={(notice) => {
            setOpen(false)
            onExcused(notice)
          }}
        />
      )}
    </>
  )
}
