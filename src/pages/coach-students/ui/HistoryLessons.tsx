import { GROUP_LESSON_LIMIT, HistoryLessonRow, useGroupLessons } from '@/entities/booking'
import type { Group } from '@/entities/group'
import { plural } from '@/shared/lib/format'
import type { Instant } from '@/shared/lib/time'

import { historyRow, HistorySection } from './HistorySection'

type HistoryLessonsProps = {
  group: Pick<Group, 'group_id' | 'opening_used_lessons'>
  /** Lessons per package: "lesson 2 of 4". */
  packageSize: number
  now: Instant
}

/**
 * History's lessons, newest first (coach-students §3.9, §8): "Sat 3 Oct, 5:00–6:00 pm" over
 * "Booked · Package 6 · lesson 2 of 4" and the pool, then the lessons used before the app,
 * "Starting balance · 20 lessons used".
 */
export function HistoryLessons({ group, packageSize, now }: HistoryLessonsProps) {
  const read = useGroupLessons(group.group_id)
  const lessons = read.data?.lessons ?? []
  const opening = group.opening_used_lessons
  return (
    <HistorySection title="Lessons" read={read}>
      {lessons.length === 0 && <p className="py-3 text-label text-muted">No lessons yet.</p>}
      {(lessons.length > 0 || opening > 0) && (
        <ul role="list">
          {lessons.map((lesson) => (
            <HistoryLessonRow key={lesson.id} lesson={lesson} packageSize={packageSize} now={now} />
          ))}
          {opening > 0 && (
            <li className={historyRow}>
              <span className="text-sm leading-[normal] font-semibold">
                {`Starting balance · ${plural(opening, 'lesson')} used`}
              </span>
            </li>
          )}
        </ul>
      )}
      {read.data?.hasMore && (
        <p className="pt-3 text-label text-muted">{`Showing the latest ${GROUP_LESSON_LIMIT} lessons.`}</p>
      )}
    </HistorySection>
  )
}
