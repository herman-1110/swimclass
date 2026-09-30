import type { Instant } from '@/shared/lib/time'

import { historyLessonLine, historyPlaceLine } from '../model/past'
import type { GroupLesson } from '../model/types'
import { lessonDateRange } from '../model/when'

type HistoryLessonRowProps = {
  lesson: GroupLesson
  /** group_balance.package_size (lessons_per_package): "lesson 2 of 4". */
  packageSize: number
  /** useNow(): a lesson in another year shows the year ("Fri 12 Dec 2025, 7:30–8:30 pm"). */
  now?: Instant
  /** li (default) inside the page's <ul role="list">, or div. */
  as?: 'li' | 'div'
}

/**
 * A lesson in the coach's History drawer (coach-students spec §3.9, proposed look; §8
 * samples), laid out like PaymentRow's history variant: "Sat 3 Oct, 5:00–6:00 pm" (14 px,
 * 600), "Booked · Package 6 · lesson 2 of 4" (13 px), "Sunrise Res." or "Palm Court · Gap
 * override" (13 px muted). Cancelled and excused lessons say so, without numbers.
 */
export function HistoryLessonRow({
  lesson,
  packageSize,
  now,
  as: Element = 'li',
}: HistoryLessonRowProps) {
  return (
    <Element className="flex flex-col gap-0.5 border-b border-line py-3 break-words">
      <span className="text-sm leading-[normal] font-semibold">
        {lessonDateRange(lesson.starts_at, lesson.ends_at, now)}
      </span>
      <span className="text-label">{historyLessonLine(lesson, packageSize)}</span>
      <span className="text-label text-muted">{historyPlaceLine(lesson)}</span>
    </Element>
  )
}
