import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { type DateKey, mytWeekStart, weekDays } from '@/shared/lib/time'

import { coachWeekQuery } from './weekQueries'

/**
 * coach_week for the week that starts on `weekStart` (a Monday): the coach's grid, day view
 * and exceptions list. While another week loads, the last one stays on screen
 * (coach-schedule §6.1); CoachWeekGrid and CoachDayView dim it and mark it busy.
 */
export function useCoachWeek(weekStart: DateKey) {
  return useQuery({ ...coachWeekQuery(weekStart), placeholderData: keepPreviousData })
}

/**
 * One day of the coach's week (the Today section, coach-schedule §3.5): it selects from the
 * coach_week query of the day's week, the same one as the grid when that week is shown.
 */
export function useCoachDay(day: DateKey) {
  const weekStart = mytWeekStart(day)
  return useQuery({
    ...coachWeekQuery(weekStart),
    select: (week) => week[weekDays(weekStart).indexOf(day)],
  })
}
