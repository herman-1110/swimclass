import { type ReactNode, useId } from 'react'

import { cn } from '@/shared/lib/cn'
import { plural } from '@/shared/lib/format'
import type { DateKey } from '@/shared/lib/time'
import { DayStrip } from '@/shared/ui/DayStrip'

import { weekDays } from '../model/days'
import { dayLessonsLabel } from '../model/describe'
import { dayHeading, formatDayLong } from '../model/labels'
import { bookedLessons, isWeekOf } from '../model/select'
import { coachDayTimeline, coachWeekHours } from '../model/timeline'
import type { BookedCoachLesson, CoachWeek } from '../model/types'
import { DayViewItem } from './DayViewItem'
import { DayViewLoading } from './DayViewLoading'

type CoachDayViewProps = {
  /** The Monday of the week shown. */
  weekStart: DateKey
  /**
   * useCoachWeek(weekStart).data: undefined while the first week loads or after it failed.
   * While another week loads it is still the last week, shown dimmed (coach-schedule §6.1).
   */
  week: CoachWeek | undefined
  /** The chosen day, in weekStart's week (the page's ?day). */
  day: DateKey
  /** A day was picked in the strip. */
  onSelectDay: (day: DateKey) => void
  /** A lesson was chosen: open its details. */
  onSelectLesson: (lesson: BookedCoachLesson) => void
  /** The week failed to load: shown in place of the day's list (the message and "Try again"). */
  error?: ReactNode
}

/**
 * The coach's week on phones (design/AdminSchedulePhone.dc.html; coach-schedule §3.4): a
 * day strip with each date's number of lessons, the chosen day's title ("Saturday 3 Oct"),
 * and that day as a list of blocks with their start times on the left: lessons (buttons
 * that open the details), travel, free and closed time, over the same hours as the grid.
 * It hides itself from 768 px, where CoachWeekGrid shows the week.
 */
export function CoachDayView({
  weekStart,
  week,
  day,
  onSelectDay,
  onSelectLesson,
  error,
}: CoachDayViewProps) {
  const titleId = useId()
  const shown = error ? undefined : week
  const current = shown && isWeekOf(shown, weekStart) ? shown : undefined
  const dates = weekDays(weekStart)
  const index = dates.indexOf(day)
  const shownDay = shown && index >= 0 ? shown[index] : undefined
  // The same hours as the grid (coach-schedule §3.4).
  const items = shown && shownDay ? coachDayTimeline(shownDay, coachWeekHours(shown)) : []

  return (
    <div className="flex flex-col gap-3.5 md:hidden">
      <DayStrip
        days={dates.map((date, i) => ({
          key: date,
          ...dayHeading(date),
          label: current ? dayLessonsLabel(current[i]) : formatDayLong(date),
          // Until the week is in, a blank line keeps the dates where they will stay.
          caption: current ? plural(bookedLessons(current[i]).length, 'lesson') : ' ',
        }))}
        selected={day}
        onSelect={onSelectDay}
      />
      <h2 id={titleId} className="mt-1 text-body font-semibold">
        {formatDayLong(day)}
      </h2>
      {shown ? (
        <ol
          role="list"
          aria-labelledby={titleId}
          aria-busy={current ? undefined : true}
          className={cn(
            'm-0 flex list-none flex-col gap-1.5 p-0 transition-opacity',
            !current && 'opacity-60',
          )}
        >
          {shownDay &&
            items.map((item) => (
              <DayViewItem
                key={item.start}
                day={shownDay.day}
                item={item}
                onSelectLesson={current && onSelectLesson}
              />
            ))}
        </ol>
      ) : (
        (error ?? <DayViewLoading />)
      )}
    </div>
  )
}
