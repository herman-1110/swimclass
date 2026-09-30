import type { Row } from '@/shared/api/rpc'

// The weekly open hours and the one-off changes to them (PRD BR-29, BR-30; data-contracts
// §3.7). Field names are the database's own.

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

/**
 * A time of day as Postgres writes it, MYT wall clock: "17:30:00"; a range may end at
 * "24:00:00" (midnight).
 */
export type TimeOfDay = string

/** One range of the weekly template (availability_rules): Saturday 07:00–12:00. */
export type WeeklyRange = { weekday: Weekday; opens_at: TimeOfDay; closes_at: TimeOfDay }

/** Block time ("closed") or Open extra time ("open"). */
export type ExceptionKind = Row<'availability_exceptions'>['kind']

/**
 * A one-off change to the open hours (availability_exceptions), without the coach's private
 * note: no account may read that column (the coach reads notes through coach_week).
 * Times are UTC text, "2026-10-03T01:00:00+00:00".
 */
export type AvailabilityException = Omit<Row<'availability_exceptions'>, 'note'>
