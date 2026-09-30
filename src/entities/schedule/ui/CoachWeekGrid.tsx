import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'
import { type DateKey, weekDays } from '@/shared/lib/time'
import { WeekGrid, type WeekGridBlock } from '@/shared/ui/WeekGrid'

import { dayLessonsLabel, describeCoachDay } from '../model/describe'
import { coachHourLabel, dayHeading, formatCoachWeekLabel, formatDayLong } from '../model/labels'
import { isWeekOf } from '../model/select'
import { coachDayTimeline, coachWeekHours, DEFAULT_HOURS, type GridHours } from '../model/timeline'
import type { BookedCoachLesson, CoachWeek } from '../model/types'
import { CoachLessonLines } from './CoachLessonLines'
import { WeekLoading } from './WeekLoading'

type CoachWeekGridProps = {
  /** The Monday of the week shown. The headers show its dates before the data arrives. */
  weekStart: DateKey
  /**
   * useCoachWeek(weekStart).data: undefined while the first week loads or after it failed.
   * While another week loads it is still the last week (keepPreviousData): the grid keeps
   * it on screen, dimmed and busy, with nothing to click (coach-schedule §6.1).
   */
  week: CoachWeek | undefined
  /** A lesson block was chosen (click, Enter or Space): open its details. */
  onSelectLesson: (lesson: BookedCoachLesson) => void
  /**
   * The week failed to load: what to show over the empty day columns instead of the loading
   * look (the message and "Try again"). Leave out while there is a week to show.
   */
  error?: ReactNode
}

function blocksOf(
  week: CoachWeek,
  hours: GridHours,
  onSelectLesson?: (lesson: BookedCoachLesson) => void,
): WeekGridBlock[] {
  return week.flatMap((day, column) =>
    coachDayTimeline(day, hours).flatMap((item): WeekGridBlock[] => {
      const block = { key: `${day.day}-${item.start}`, column, start: item.start, end: item.end }
      if (item.kind === 'lesson') {
        const { lesson } = item
        return [
          {
            ...block,
            key: lesson.booking_id,
            tone: 'accent',
            content: <CoachLessonLines lesson={lesson} />,
            onSelect: onSelectLesson && (() => onSelectLesson(lesson)),
          },
        ]
      }
      // Free time isn't drawn: the white column shows through.
      return item.kind === 'free' ? [] : [{ ...block, tone: item.kind }]
    }),
  )
}

/**
 * The coach's week from 768 px (design/AdminSchedule.dc.html; coach-schedule §3.3, §7.2):
 * 56 px per hour, lesson blocks with names, time and place (and "2 lessons", "Gap
 * override"), travel and closed blocks; free time stays white. Each day is a list whose
 * lessons are buttons, after a hidden summary of its open hours. Phones get CoachDayView
 * instead: this grid hides itself below 768 px.
 */
export function CoachWeekGrid({ weekStart, week, onSelectLesson, error }: CoachWeekGridProps) {
  const shown = error ? undefined : week
  const current = shown && isWeekOf(shown, weekStart) ? shown : undefined
  const hours = shown ? coachWeekHours(shown) : DEFAULT_HOURS
  const days = weekDays(weekStart).map((day, index) => ({
    key: day,
    ...dayHeading(day),
    label: current ? dayLessonsLabel(current[index]) : formatDayLong(day),
    summary: current ? describeCoachDay(current[index]) : undefined,
  }))
  return (
    <div
      className={cn(
        'flex flex-col transition-opacity max-md:hidden',
        shown && !current && 'opacity-60',
      )}
    >
      {/* So heading navigation reaches the grid (coach-schedule §7.2). */}
      <h2 className="sr-only">Week timetable</h2>
      <WeekGrid
        size="comfortable"
        interactive
        days={days}
        blocks={shown ? blocksOf(shown, hours, current && onSelectLesson) : []}
        from={hours.from}
        to={hours.to}
        hourLabel={coachHourLabel}
        label={`Week of ${formatCoachWeekLabel(weekStart)}`}
        overlay={
          shown
            ? undefined
            : (error ?? <WeekLoading size="comfortable" status="Loading the week" />)
        }
        busy={!current && !error}
      />
    </div>
  )
}
