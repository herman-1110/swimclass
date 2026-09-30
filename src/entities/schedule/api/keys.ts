import type { DateKey } from '@/shared/lib/time'

/** Query keys for week views (week_busy, coach_week) (ARCHITECTURE §3.6): features refresh them after a change. */
export const scheduleKeys = {
  all: ['schedule'] as const,
  /** week_busy for the week that starts on a Monday: the customer's view. */
  customerWeek: (weekStart: DateKey) => [...scheduleKeys.all, 'customer-week', weekStart] as const,
  /** coach_week for the week that starts on a Monday: the coach's view. */
  coachWeek: (weekStart: DateKey) => [...scheduleKeys.all, 'coach-week', weekStart] as const,
}
