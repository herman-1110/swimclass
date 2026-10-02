/** Query keys for the weekly open hours (ARCHITECTURE §3.6): features refresh them after a change. */
export const openHoursKeys = {
  all: ['open-hours'] as const,
  /** availability_rules: the weekly template. */
  weekly: () => [...openHoursKeys.all, 'weekly'] as const,
}
