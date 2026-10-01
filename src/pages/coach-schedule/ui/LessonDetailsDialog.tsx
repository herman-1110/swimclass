import { useState } from 'react'

import { lessonDateRange } from '@/entities/booking'
import type { BookedCoachLesson } from '@/entities/schedule'
import { CancelLessonDialog } from '@/features/cancel-lesson'
import { ExcuseLessonButton } from '@/features/excuse-lesson'
import { useNow } from '@/shared/lib/hooks/useNow'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'

import { LessonFacts } from './LessonFacts'

type LessonDetailsDialogProps = {
  /** The lesson chosen in the grid or the day view. Render one per lesson (key it). */
  lesson: BookedCoachLesson
  /** "Close" and Esc. */
  onClose: () => void
  /**
   * The lesson was cancelled or excused: close the details and show the notice ("Lesson
   * cancelled. Mei Ling will get an email."). The lesson leaves the week, so focus goes to
   * the notice.
   */
  onDone: (notice: string) => void
}

/**
 * A lesson's details (DESIGN §4; the Schedule spec §6.6, §7.4): the names, "Sat 3 Oct,
 * 9:00–10:00 am", the group, place, position and package, then "Cancel lesson" (its own
 * confirmation over this one, with the optional reason for the customer's email) and "Mark
 * as excused" once the lesson has started. Focus starts on the title.
 */
export function LessonDetailsDialog({ lesson, onClose, onDone }: LessonDetailsDialogProps) {
  const now = useNow()
  const [cancelling, setCancelling] = useState(false)

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
