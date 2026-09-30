import type { ReactNode } from 'react'

import type { Instant } from '@/shared/lib/time'

import { cancelNote, cancelState } from '../model/cancel'
import { upcomingPosition } from '../model/position'
import type { UpcomingLesson } from '../model/types'
import { lessonWhen } from '../model/when'
import { LessonRowLayout } from './LessonRowLayout'

type LessonRowProps = {
  lesson: UpcomingLesson
  /** The group's names (group_details.display_names): "Aiman & Sofia". */
  names: string
  /** The group's type: "1-to-2". */
  typeLabel: string
  /** lessons_per_package (settings): "lesson 2 of 4". */
  packageSize: number
  /**
   * The group's current package (group_balance.package_no). A lesson in a later package then
   * reads "Package 3, lesson 1 of 4". Left out: never.
   */
  currentPackageNo?: number | null
  /** cancel_cutoff_hours (settings). */
  cutoffHours: number
  /** useNow(): today's lessons read "Today, …", and the row turns Locked at the cutoff. */
  now: Instant
  /**
   * The Cancel button (features/cancel-lesson), shown only while the lesson can be cancelled.
   * It gets the id of the note under the row ("Free to cancel until 3:00 am, Sat 3 Oct."), for
   * its aria-describedby.
   */
  action?: (noteId: string) => ReactNode
  /** li (default) inside the page's <ul role="list">, or div. */
  as?: 'li' | 'div'
}

/**
 * An upcoming lesson on My classes (MyClasses.dc.html:58-90): when, who and which lesson,
 * where, and on the right the Cancel button or "Locked", with the deadline or the reason under
 * it (BR-15). The database has the final say when the customer cancels (`locked`).
 */
export function LessonRow({
  lesson,
  names,
  typeLabel,
  packageSize,
  currentPackageNo = null,
  cutoffHours,
  now,
  action,
  as,
}: LessonRowProps) {
  const state = cancelState(lesson.starts_at, now, cutoffHours)
  const noteId = `lesson-${lesson.id}-note`
  const position = upcomingPosition(lesson.position, packageSize, currentPackageNo)
  return (
    <LessonRowLayout
      as={as}
      when={lessonWhen(lesson.starts_at, lesson.ends_at, now)}
      detail={`${names} · ${typeLabel} · ${position}`}
      location={lesson.location}
      aside={
        state === 'open' ? (
          action?.(noteId)
        ) : (
          <span className="text-label whitespace-nowrap text-muted">Locked</span>
        )
      }
      note={cancelNote(state, lesson.starts_at, cutoffHours)}
      noteId={noteId}
    />
  )
}
