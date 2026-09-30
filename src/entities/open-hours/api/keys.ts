import type { DateKey } from '@/shared/lib/time'

/** Query keys for weekly open hours and one-off exceptions (ARCHITECTURE §3.6): features refresh them after a change. */
export const openHoursKeys = {
  all: ['open-hours'] as const,
  /** availability_rules: the weekly template. */
  weekly: () => [...openHoursKeys.all, 'weekly'] as const,
  /** availability_exceptions touching the MYT days from `from` up to (not including) `to`. */
  exceptions: (from: DateKey, to: DateKey) =>
    [...openHoursKeys.all, 'exceptions', from, to] as const,
}
