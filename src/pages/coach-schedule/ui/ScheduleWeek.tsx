import type { UseQueryResult } from '@tanstack/react-query'
import { useRef } from 'react'

import {
  type BookedCoachLesson,
  CoachDayView,
  type CoachWeek,
  CoachWeekGrid,
} from '@/entities/schedule'
import type { DateKey } from '@/shared/lib/time'

import { LoadError } from './LoadError'

type ScheduleWeekProps = {
  /** The Monday of the week shown. */
  weekStart: DateKey
  /** useCoachWeek(weekStart): the last week stays, dimmed, while the next one loads. */
  week: UseQueryResult<CoachWeek>
  /** The chosen day: the phone's day view shows it. */
  day: DateKey
  onSelectDay: (day: DateKey) => void
  onSelectLesson: (lesson: BookedCoachLesson) => void
}

/**
 * The week: the grid from 768 px and the day view on phones (the Schedule spec §2.1, §3.3,
 * §3.4). Both are in the page and CSS shows one; they read the same query. When the week
 * can't be read, both show why with "Try again" (§6.1); a failed refresh of a week already
 * on screen keeps showing it. "Try again" hands focus to the week, which takes its place.
 */
export function ScheduleWeek({
  weekStart,
  week,
  day,
  onSelectDay,
  onSelectLesson,
}: ScheduleWeekProps) {
  const box = useRef<HTMLDivElement>(null)
  const error =
    week.isError && !week.data ? (
      <LoadError error={week.error} onRetry={() => void week.refetch()} focusAfter={box} />
    ) : undefined
  return (
    <div ref={box} tabIndex={-1} className="flex min-w-0 flex-col">
      <CoachWeekGrid
        weekStart={weekStart}
        week={week.data}
        onSelectLesson={onSelectLesson}
        error={error}
      />
      <CoachDayView
        weekStart={weekStart}
        week={week.data}
        day={day}
        onSelectDay={onSelectDay}
        onSelectLesson={onSelectLesson}
        error={error}
      />
    </div>
  )
}
