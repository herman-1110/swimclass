import type { ReactNode } from 'react'

import type { CoachWeek, ExceptionKind } from '@/entities/schedule'
import type { DateKey } from '@/shared/lib/time'
import { Banner } from '@/shared/ui/Banner'

import {
  ALREADY_OPEN,
  blockedInsideMessage,
  STAY_BOOKED,
  STAY_BOOKED_HINT,
  stayBookedLine,
} from '../model/copy'
import { blocksInside, dayOf, isOpenAlready, lessonsInside } from '../model/preview'
import { type DayRange, rangeOn } from '../model/times'

type ExceptionPreviewProps = {
  kind: ExceptionKind
  /** The coach's weeks the days fall in, as far as they have loaded. */
  weeks: readonly CoachWeek[]
  dates: readonly DateKey[]
  /** Minutes of the day; null until both are chosen and the end is after the start. */
  from: number | null
  to: number | null
}

/** Block time: the booked lessons it leaves booked (prompt 08), or nothing. */
function stayBooked(weeks: readonly CoachWeek[], ranges: readonly DayRange[]): ReactNode {
  const lessons = lessonsInside(weeks, ranges)
  if (lessons.length === 0) return null
  return (
    <Banner tone="warn">
      <p>{STAY_BOOKED}</p>
      <ul role="list" className="my-1 list-none p-0">
        {lessons.map((lesson) => (
          <li key={lesson.booking_id}>{stayBookedLine(lesson)}</li>
        ))}
      </ul>
      <p>{STAY_BOOKED_HINT}</p>
    </Banner>
  )
}

/** Open extra time: part of it is blocked (blocked time wins), or it is all open already. */
function extraTimeNote(weeks: readonly CoachWeek[], range: DayRange | undefined): ReactNode {
  const day = range && dayOf(weeks, range.date)
  if (!range || !day) return null
  const blocks = blocksInside(day, range)
  if (blocks.length > 0) return <Banner tone="warn">{blockedInsideMessage(blocks)}</Banner>
  if (isOpenAlready(day, range)) {
    return <p className="text-label leading-normal text-muted">{ALREADY_OPEN}</p>
  }
  return null
}

/**
 * What the coach's week says about the time before it is saved (prompt 08 TASK 5; the
 * Schedule spec §6.5): Block time lists the lessons it leaves booked; Open extra time warns
 * when part of it is blocked or says it is open already. A polite live region, so a warning
 * is read out as the times change. Nothing while a week loads.
 */
export function ExceptionPreview({ kind, weeks, dates, from, to }: ExceptionPreviewProps) {
  const ranges = from === null || to === null ? [] : dates.map((date) => rangeOn(date, from, to))
  return (
    // While empty it takes no room: the margin cancels the form's 18 px gap above it.
    <div aria-live="polite" className="flex flex-col empty:-mt-4.5">
      {kind === 'closed' ? stayBooked(weeks, ranges) : extraTimeNote(weeks, ranges.at(0))}
    </div>
  )
}
