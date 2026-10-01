import {
  LessonRowLayout,
  lessonWhen,
  type UpcomingLesson,
  upcomingPosition,
} from '@/entities/booking'
import type { Group } from '@/entities/group'
import { CancelLessonButton, cancelNote } from '@/features/cancel-lesson'

type UpcomingLessonRowProps = {
  lesson: UpcomingLesson
  group: Pick<Group, 'display_names' | 'type_label'>
  /** group_balance.package_no: a lesson in a later package says so ("Package 3, lesson 1 of
   *  4"); null when the balance isn't known. */
  currentPackageNo: number | null
  /** lessons_per_package (settings). */
  packageSize: number
  /** cancel_cutoff_hours (settings). */
  cutoffHours: number
  /** useNow(). */
  now: Date
  /** The lesson is cancelled: the page shows this notice. */
  onCancelled: (notice: string) => void
}

/**
 * An upcoming lesson (MyClasses.dc.html:58-90): when, who and which lesson, where, and on the
 * right "Cancel" until the deadline, then "Locked", with the deadline or the reason under it.
 * Both come from features/cancel-lesson, one source for the row: its button stays mounted when
 * the deadline passes, so a confirmation that is already open stays open and the database
 * answers `locked` (my-classes §6).
 */
export function UpcomingLessonRow({
  lesson,
  group,
  currentPackageNo,
  packageSize,
  cutoffHours,
  now,
  onCancelled,
}: UpcomingLessonRowProps) {
  const noteId = `lesson-${lesson.id}-note`
  const position = upcomingPosition(lesson.position, packageSize, currentPackageNo)
  return (
    <LessonRowLayout
      when={lessonWhen(lesson.starts_at, lesson.ends_at, now)}
      detail={`${group.display_names} · ${group.type_label} · ${position}`}
      location={lesson.location}
      aside={
        <CancelLessonButton
          lesson={{
            booking_id: lesson.id,
            starts_at: lesson.starts_at,
            ends_at: lesson.ends_at,
            display_names: group.display_names,
          }}
          cutoffHours={cutoffHours}
          now={now}
          describedBy={noteId}
          onCancelled={onCancelled}
        />
      }
      note={cancelNote(lesson.starts_at, cutoffHours, now)}
      noteId={noteId}
    />
  )
}
