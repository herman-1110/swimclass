import { useQueries } from '@tanstack/react-query'
import { useState } from 'react'

import { coachWeekQuery, type ExceptionKind } from '@/entities/schedule'
import { usePublicSettings } from '@/entities/settings'
import type { DateKey } from '@/shared/lib/time'

import { dayOf, openHoursOf } from '../model/preview'
import { daysToSave, weeksOf } from '../model/times'

/** From and To as minutes of the day; null for "Choose". */
export type Times = { from: number | null; to: number | null }

export type ExceptionDraft = {
  /** The date fields' "yyyy-MM-dd" ("" while cleared). */
  date: string
  /** Block time's "Until (optional)", or "". */
  until: string
  /** The times the coach chose; null until then: Block time shows the day's open hours. */
  times: Times | null
  note: string
}

/**
 * Block time's or Open extra time's state and what follows from it: the days to save, the
 * coach's weeks they fall in (for the warnings, read as they are needed), the start step,
 * the times (Block time starts on the day's open hours, Open extra time on "Choose"), and
 * whether it can be saved.
 */
export function useExceptionDraft(kind: ExceptionKind, defaultDate: DateKey) {
  const [draft, setDraft] = useState<ExceptionDraft>({
    date: defaultDate,
    until: '',
    times: null,
    note: '',
  })
  const step = usePublicSettings().data?.start_step_minutes ?? null
  const { dates, untilBefore } = daysToSave(draft.date, kind === 'closed' ? draft.until : '')
  const weeks = useQueries({ queries: weeksOf(dates).map((week) => coachWeekQuery(week)) })
  const loaded = weeks.flatMap((week) => (week.data ? [week.data] : []))
  const day = dayOf(loaded, draft.date)
  const { from, to }: Times =
    draft.times ??
    (kind === 'closed' && day && step ? openHoursOf(day, step) : { from: null, to: null })
  const badRange = from !== null && to !== null && to <= from

  return {
    draft,
    setDraft,
    step,
    dates,
    untilBefore,
    /** The coach's weeks the days fall in, as far as they have loaded. */
    weeks: loaded,
    from,
    to,
    badRange,
    complete: dates.length > 0 && !untilBefore && from !== null && to !== null && !badRange,
  }
}
