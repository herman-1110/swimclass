import type { ReactNode } from 'react'

import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import { type DateKey, weekDays } from '@/shared/lib/time'
import { WeekGrid, type WeekGridBlock } from '@/shared/ui/WeekGrid'

import { customerHourLabel, dayHeading, formatDayKey } from '../model/labels'
import { isWeekOf } from '../model/select'
import {
  customerDayTimeline,
  customerWeekHours,
  DEFAULT_HOURS,
  type GridHours,
} from '../model/timeline'
import type { CustomerWeek } from '../model/types'
import { scheduleWords } from '../model/words'
import { CustomerWeekText } from './CustomerWeekText'
import { WeekLoading } from './WeekLoading'

type CustomerWeekGridProps = {
  /** The Monday of the week shown. The headers show its dates before the data arrives. */
  weekStart: DateKey
  /** useCustomerWeek(weekStart).data: undefined while it loads or after it failed. */
  week: CustomerWeek | undefined
  /**
   * Where a day's header leads: Book on that day (`${ROUTES.book}?day=${day}`), or undefined
   * for a plain header (days already past, customer-schedule §6.5).
   */
  dayHref: (day: DateKey) => string | undefined
  /**
   * The week failed to load: what to show over the empty day columns instead of the loading
   * look (the message and "Try again"). Leave out while there is a week to show.
   */
  error?: ReactNode
}

/** The blocks of a week: closed, travel, other people's lessons, and the viewer's own ("You"). Free time stays white. */
function blocksOf(week: CustomerWeek, hours: GridHours, you: string): WeekGridBlock[] {
  return week.flatMap((day, column) =>
    customerDayTimeline(day, hours).flatMap((item): WeekGridBlock[] => {
      const block = { key: `${day.day}-${item.start}`, column, start: item.start, end: item.end }
      if (item.kind === 'lesson') {
        return [
          item.lesson.mine
            ? { ...block, tone: 'accent', content: you }
            : { ...block, tone: 'booked-other' },
        ]
      }
      return item.kind === 'free' ? [] : [{ ...block, tone: item.kind }]
    }),
  )
}

/**
 * The coach's week as a customer sees it (design/Schedule.dc.html; customer-schedule §2–§7):
 * 7 day columns on half-hour lines, closed time grey, travel peach, other people's lessons
 * "Booked" with no names (CLAUDE.md rule 6), the viewer's own lessons "You", free time white.
 * The headers open Book on their day. One picture for screen readers, with the week in words
 * after it.
 */
export function CustomerWeekGrid({ weekStart, week, dayHref, error }: CustomerWeekGridProps) {
  const language = useLanguage()
  const w = wordsIn(scheduleWords, language)
  const shown = !error && week && isWeekOf(week, weekStart) ? week : undefined
  const hours = shown ? customerWeekHours(shown) : DEFAULT_HOURS
  const days = weekDays(weekStart).map((day) => ({
    key: day,
    ...dayHeading(day, language),
    label: w.bookOn(formatDayKey(day, language)),
    to: dayHref(day),
  }))
  return (
    <WeekGrid
      size="compact"
      days={days}
      blocks={shown ? blocksOf(shown, hours, w.you) : []}
      from={hours.from}
      to={hours.to}
      hourLabel={(minute) => customerHourLabel(minute, language)}
      label={w.picture}
      summary={
        shown ? <CustomerWeekText weekStart={weekStart} week={shown} hours={hours} /> : undefined
      }
      overlay={shown ? undefined : (error ?? <WeekLoading size="compact" status={w.loading} />)}
      busy={!shown && !error}
    />
  )
}
