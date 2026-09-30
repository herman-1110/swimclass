import type { DateKey } from '@/shared/lib/time'

// The two week views (TECH_SPEC §5.1; data-contracts §3.9 and §6.4). The database builds
// their JSON itself, so the generated types only say `Json`; parseWeek.ts checks the shape.
// Field names are the database's own.

/**
 * A time inside week_busy and coach_week: MYT wall-clock text with its offset,
 * "2026-10-03T09:00:00+08:00" (data-contracts §2.5). Read it with shared/lib/time.
 */
export type MytInstant = string

/** A stretch of time: an open window, blocked time, a lesson. */
export type TimeRange = { starts_at: MytInstant; ends_at: MytInstant }

/**
 * Travel minutes around a booked lesson (lesson_travel): the travel gap, shortened beside a
 * closer neighbour, and 0 beside the neighbour a gap-override lesson was squeezed next to.
 */
export type Travel = { travel_before: number; travel_after: number }

/**
 * A booked lesson in the customer's week (week_busy). Other people's lessons carry no
 * name, location or id (CLAUDE.md rule 6); the viewer's own also have their ids.
 */
export type BusyLesson = TimeRange &
  Travel &
  ({ mine: false } | { mine: true; booking_id: string; group_id: string })

/** One of the viewer's own lessons. */
export type OwnBusyLesson = Extract<BusyLesson, { mine: true }>

/** One day of week_busy. */
export type CustomerDay = {
  day: DateKey
  /** Open windows (weekly hours plus extra time, minus blocked time), cut at midnight. */
  open: TimeRange[]
  /** Blocked time (Block time), cut to the day. Drawing closed = outside `open` covers it. */
  closed: TimeRange[]
  /** Booked lessons starting this day, past ones too, in start order. */
  busy: BusyLesson[]
}

/** week_busy: the 7 days from a Monday, in date order. */
export type CustomerWeek = CustomerDay[]

/** Block time ("closed") or Open extra time ("open"). */
export type ExceptionKind = 'closed' | 'open'

/** A one-off change to the open hours, uncut, with the coach's private note. */
export type CoachException = TimeRange & { id: string; kind: ExceptionKind; note: string | null }

export type TypeLabel = '1-to-1' | '1-to-2' | '1-to-3'

type CoachLessonBase = TimeRange & {
  booking_id: string
  group_id: string
  account_id: string
  /** The account holder's display name ("Mei Ling"). */
  account_name: string
  /** The students: "Aiman & Sofia". */
  display_names: string
  type_label: TypeLabel
  size: 1 | 2 | 3
  /** The lesson's own location. */
  location: string
  /** Lessons it uses: 2 for a 2-hour lesson. */
  lessons: 1 | 2
  gap_override: boolean
  package_size: number
  /** The group's flag: its current package isn't paid ("Unpaid"). */
  unpaid: boolean
  /** This booked lesson is the group's last paid one ("Last paid lesson"). */
  last_lesson: boolean
}

/** A booked lesson in the coach's week, with its ledger position. */
export type BookedCoachLesson = CoachLessonBase &
  Travel & {
    status: 'booked'
    /** Its end time has passed: it counts ("done"). */
    used: boolean
    package_no: number
    lesson_in_package: number
  }

/** A cancelled or excused lesson: no travel, no ledger position. */
export type UnbookedCoachLesson = CoachLessonBase & {
  status: 'cancelled' | 'excused'
  travel_before: null
  travel_after: null
  used: null
  package_no: null
  lesson_in_package: null
}

/** Every booking in the coach's week, any status (coach_week). */
export type CoachLesson = BookedCoachLesson | UnbookedCoachLesson

/** One day of coach_week. */
export type CoachDay = {
  day: DateKey
  open: TimeRange[]
  closed: TimeRange[]
  /** Every exception touching the day, uncut: one across midnight is on both days. */
  exceptions: CoachException[]
  /** Every booking starting this day, any status, in start order. */
  lessons: CoachLesson[]
}

/** coach_week: the 7 days from a Monday, in date order. */
export type CoachWeek = CoachDay[]
