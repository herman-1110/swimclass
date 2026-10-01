import { useEffect, useEffectEvent, useState } from 'react'

import { lessonDateRange } from '@/entities/booking'
import type { BookedCoachLesson, CoachWeek } from '@/entities/schedule'
import { CancelLessonDialog } from '@/features/cancel-lesson'
import { ExcuseLessonButton } from '@/features/excuse-lesson'
import { useNow } from '@/shared/lib/hooks/useNow'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'

import { LessonFacts } from './LessonFacts'
import { staleLessonMessage } from './staleLesson'

type LessonDetailsDialogProps = {
  /** The lesson chosen in the grid or the day view. Render one per lesson (key it). */
  lesson: BookedCoachLesson
  /** The week shown, as last read (useCoachWeek(weekStart).data). */
  week: CoachWeek | undefined
  /** "Close" and Esc. */
  onClose: () => void
  /**
   * The lesson is no longer booked: cancelled or excused here ("Lesson cancelled. Mei Ling
   * will get an email."), or elsewhere, which the week read again shows ("This lesson is
   * already cancelled. Refresh to see the latest."). Close the details and show the notice;
   * the lesson's block is gone, so focus goes to the notice.
   */
  onDone: (notice: string) => void
}

/**
 * A lesson's details (DESIGN §4; the Schedule spec §6.6, §7.4): the names, "Sat 3 Oct,
 * 9:00–10:00 am", the group, place, position and package, then "Cancel lesson" (its own
 * confirmation over this one, with the optional reason for the customer's email) and "Mark
 * as excused" once the lesson has started. Focus starts on the title.
 *
 * A refusal that says the lesson was already cancelled or excused (§6.6, `not_booked`)
 * refreshes the week when its confirmation closes; then nothing here can be done, so the
 * details close too, with those words in the notice.
 */
export function LessonDetailsDialog({ lesson, week, onClose, onDone }: LessonDetailsDialogProps) {
  const now = useNow()
  const [cancelling, setCancelling] = useState(false)
  const stale = staleLessonMessage(week, lesson)
  const closeStale = useEffectEvent((message: string) => onDone(message))

  // Once nothing is stacked over the details (the coach has read the refusal).
  useEffect(() => {
    if (stale !== null && !cancelling) closeStale(stale)
  }, [stale, cancelling])

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        size="md"
        title={lesson.display_names}
        subtitle={lessonDateRange(lesson.starts_at, lesson.ends_at, now)}
      >
        <LessonFacts lesson={lesson} />
        <div className="flex flex-col items-start gap-1 border-t border-line pt-3.5">
          <Button variant="link" flush aria-haspopup="dialog" onClick={() => setCancelling(true)}>
            Cancel lesson
          </Button>
          <ExcuseLessonButton lesson={lesson} now={now} onExcused={onDone} />
        </div>
      </Dialog>
      <CancelLessonDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        lesson={lesson}
        audience="coach"
        onCancelled={(notice) => {
          setCancelling(false)
          onDone(notice)
        }}
      />
    </>
  )
}
