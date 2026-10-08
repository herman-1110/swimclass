import { useLanguage } from '@/shared/i18n/context'
import type { Instant } from '@/shared/lib/time'

import { pastLessonDetail, pastLessonNote, pastStatusLabel } from '../model/past'
import type { PastLesson } from '../model/types'
import { lessonWhen } from '../model/when'
import { LessonRowLayout } from './LessonRowLayout'

type PastLessonRowProps = {
  lesson: PastLesson
  /** The group's names (group_details.display_names): "Wei Jie". */
  names: string
  /** The group's type: "1-to-1". */
  typeLabel: string
  /** lessons_per_package (settings): "Package 2, lesson 2 of 4". */
  packageSize: number
  /** useUserId(): "Cancelled by you" rather than "by your coach". */
  myAccountId: string | null
  /** useNow(): today's lessons read "Today, …". */
  now: Instant
  /** li (default) inside the page's <ul role="list">, or div. */
  as?: 'li' | 'div'
}

/**
 * A lesson in My classes' Past lessons (my-classes spec §2.7, not drawn: laid out like the
 * upcoming rows): "Done", "Cancelled" or "Excused" on the right, and who cancelled it or why it
 * doesn't count under it.
 */
export function PastLessonRow({
  lesson,
  names,
  typeLabel,
  packageSize,
  myAccountId,
  now,
  as,
}: PastLessonRowProps) {
  const language = useLanguage()
  return (
    <LessonRowLayout
      as={as}
      when={lessonWhen(lesson.starts_at, lesson.ends_at, now, language)}
      detail={pastLessonDetail(lesson, names, typeLabel, packageSize, language)}
      location={lesson.location}
      aside={
        <span className="text-label whitespace-nowrap text-muted">
          {pastStatusLabel(lesson.status, language)}
        </span>
      }
      note={pastLessonNote(lesson, myAccountId, now, language)}
    />
  )
}
