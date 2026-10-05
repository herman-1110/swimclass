import { type ReactNode, useId } from 'react'

import { plural } from '@/shared/lib/format'
import { type DateKey, weekDays } from '@/shared/lib/time'
import { DayStrip } from '@/shared/ui/DayStrip'

import { dayButtonLabel } from '../model/describe'
import { dayButtonDate, dayHeading, formatDayLong } from '../model/labels'
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
   * While another week loads it is still the last week: the day view shows placeholders.
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
  // Only this week's lessons ever sit under this week's dates: while another week loads,
  // the list is placeholders, as on the customer Schedule (Herman, 2 Oct 2026). The grid
  // from 768 px still keeps the last week, dimmed.
  const current = !error && week && isWeekOf(week, weekStart) ? week : undefined
  const dates = weekDays(weekStart)
  const index = dates.indexOf(day)
  const currentDay = current && index >= 0 ? current[index] : undefined
  // The same hours as the grid (coach-schedule §3.4).
  const items = current && currentDay ? coachDayTimeline(currentDay, coachWeekHours(current)) : []

  return (
    <div className="flex flex-col gap-3.5 md:hidden">
      <DayStrip
        days={dates.map((date, i) => ({
          key: date,
          ...dayHeading(date),
          // While the week loads, the date alone ("Sat 3"), still the button's own words.
          label: current ? dayButtonLabel(current[i]) : dayButtonDate(date),
          // Until the week is in, a blank line keeps the dates where they will stay.
          caption: current ? plural(bookedLessons(current[i]).length, 'lesson') : ' ',
        }))}
        selected={day}
        onSelect={onSelectDay}
      />
      <h2 id={titleId} className="mt-1 text-body font-semibold">
        {formatDayLong(day)}
      </h2>
      {current ? (
        <ol
          role="list"
          aria-labelledby={titleId}
          className="m-0 flex list-none flex-col gap-1.5 p-0"
        >
          {currentDay &&
            items.map((item) => (
              <DayViewItem
                key={item.start}
                day={currentDay.day}
                item={item}
                onSelectLesson={onSelectLesson}
              />
            ))}
        </ol>
      ) : (
        (error ?? <DayViewLoading />)
      )}
    </div>
  )
}
