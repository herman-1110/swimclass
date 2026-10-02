// The weekly open hours (PRD BR-29; data-contracts §3.7). Field names are the database's own.
// The one-off changes come with the coach's week (entities/schedule).

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

/**
 * A time of day as Postgres writes it, MYT wall clock: "17:30:00"; a range may end at
 * "24:00:00" (midnight).
 */
export type TimeOfDay = string

/** One range of the weekly template (availability_rules): Saturday 07:00–12:00. */
export type WeeklyRange = { weekday: Weekday; opens_at: TimeOfDay; closes_at: TimeOfDay }
