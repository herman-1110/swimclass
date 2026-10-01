import { useSearchParams } from 'react-router'

import { useNow } from '@/shared/lib/hooks/useNow'
import { addDays, type DateKey, mytDateKey, mytInstant, mytWeekStart } from '@/shared/lib/time'

/** ?day as a real MYT date ("2026-10-03"), or null when missing or not a date. */
function dayFrom(param: string | null): DateKey | null {
  if (param === null || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return null
  try {
    mytInstant(param, '12:00')
    return param
  } catch {
    return null
  }
}

export type ScheduleDay = {
  /** The chosen day: ?day, or today. On phones it is the day view's day. */
  day: DateKey
  /** The Monday of the week shown: the ISO week holding `day`. */
  weekStart: DateKey
  /** Today in Malaysia (DEMO_NOW in demo mode). */
  today: DateKey
  /** Previous or next week: `day` ∓ 7, so the weekday stays chosen. */
  goToWeek: (weeks: number) => void
  /** "Today": drops ?day. */
  goToToday: () => void
  /** A day in the strip, or the first day of something just saved. */
  selectDay: (day: DateKey) => void
}

/**
 * The Schedule's place in time, kept in the address so a refresh or a shared link shows the
 * same week (the Schedule spec §1): `?day=2026-10-03` shows the week of 28 Sep with Saturday
 * chosen. Missing or not a date: today. Changes replace the history entry.
 */
export function useScheduleDay(): ScheduleDay {
  const [params, setParams] = useSearchParams()
  const today = mytDateKey(useNow())
  const day = dayFrom(params.get('day')) ?? today

  const setDay = (next: DateKey | null) =>
    setParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (next === null) params.delete('day')
        else params.set('day', next)
        return params
      },
      { replace: true },
    )

  return {
    day,
    weekStart: mytWeekStart(day),
    today,
    goToWeek: (weeks) => setDay(addDays(day, weeks * 7)),
    goToToday: () => setDay(null),
    selectDay: (next) => setDay(next),
  }
}
