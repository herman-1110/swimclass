import { AppError } from '@/shared/api/rpc'
import { type DateKey, toMyt } from '@/shared/lib/time'

import { addDays } from './days'
import type {
  BusyLesson,
  CoachException,
  CoachLesson,
  CoachWeek,
  CustomerDay,
  CustomerWeek,
  TimeRange,
  TypeLabel,
} from './types'

// week_busy and coach_week answer with JSON the database builds itself, typed only as
// `Json`. These check its shape once, when it arrives, and keep only the fields the screens
// use (conventions §13.2). Anything else is a bug somewhere: AppError('unknown'), which
// the screens show as the generic message (customer-schedule §5.1).

type Fields = Record<string, unknown>

function malformed(cause?: unknown) {
  return new AppError('unknown', {}, cause)
}

function record(value: unknown): Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw malformed()
  return value as Fields
}

function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw malformed()
  return value
}

function text(fields: Fields, key: string): string {
  const value = fields[key]
  if (typeof value !== 'string') throw malformed()
  return value
}

function count(fields: Fields, key: string): number {
  const value = fields[key]
  if (typeof value !== 'number' || !Number.isInteger(value)) throw malformed()
  return value
}

function flag(fields: Fields, key: string): boolean {
  const value = fields[key]
  if (typeof value !== 'boolean') throw malformed()
  return value
}

function oneOf<T extends string | number>(fields: Fields, key: string, allowed: readonly T[]): T {
  const value = fields[key]
  const match = allowed.find((option) => option === value)
  if (match === undefined) throw malformed()
  return match
}

/** A time with its offset ("2026-10-03T09:00:00+08:00"). */
function moment(fields: Fields, key: string): string {
  const value = text(fields, key)
  try {
    toMyt(value)
  } catch (error) {
    throw malformed(error)
  }
  return value
}

function timeRange(value: unknown): TimeRange {
  const fields = record(value)
  return { starts_at: moment(fields, 'starts_at'), ends_at: moment(fields, 'ends_at') }
}

/** The day of the i-th entry, checked against the week asked for. */
function dayAt(fields: Fields, weekStart: DateKey, index: number): DateKey {
  const day = text(fields, 'day')
  if (day !== addDays(weekStart, index)) throw malformed()
  return day
}

function sevenDays(json: unknown): Fields[] {
  const days = list(json).map(record)
  if (days.length !== 7) throw malformed()
  return days
}

function busyLesson(value: unknown): BusyLesson {
  const fields = record(value)
  const lesson = {
    ...timeRange(fields),
    travel_before: count(fields, 'travel_before'),
    travel_after: count(fields, 'travel_after'),
  }
  // Only the viewer's own lessons carry ids; nothing else is kept (CLAUDE.md rule 6).
  return flag(fields, 'mine')
    ? {
        ...lesson,
        mine: true,
        booking_id: text(fields, 'booking_id'),
        group_id: text(fields, 'group_id'),
      }
    : { ...lesson, mine: false }
}

/** week_busy's answer for the week that starts on `weekStart` (TECH_SPEC §5.1). */
export function parseCustomerWeek(json: unknown, weekStart: DateKey): CustomerWeek {
  return sevenDays(json).map((fields, index): CustomerDay => ({
    day: dayAt(fields, weekStart, index),
    open: list(fields.open).map(timeRange),
    closed: list(fields.closed).map(timeRange),
    busy: list(fields.busy).map(busyLesson),
  }))
}

const TYPE_LABELS: readonly TypeLabel[] = ['1-to-1', '1-to-2', '1-to-3']

function coachException(value: unknown): CoachException {
  const fields = record(value)
  const note = fields.note
  if (note !== null && typeof note !== 'string') throw malformed()
  return {
    id: text(fields, 'id'),
    kind: oneOf(fields, 'kind', ['closed', 'open'] as const),
    ...timeRange(fields),
    note,
  }
}

function coachLesson(value: unknown): CoachLesson {
  const fields = record(value)
  const lesson = {
    booking_id: text(fields, 'booking_id'),
    group_id: text(fields, 'group_id'),
    account_id: text(fields, 'account_id'),
    account_name: text(fields, 'account_name'),
    display_names: text(fields, 'display_names'),
    type_label: oneOf(fields, 'type_label', TYPE_LABELS),
    size: oneOf(fields, 'size', [1, 2, 3] as const),
    location: text(fields, 'location'),
    ...timeRange(fields),
    lessons: oneOf(fields, 'lessons', [1, 2] as const),
    gap_override: flag(fields, 'gap_override'),
    package_size: count(fields, 'package_size'),
    unpaid: flag(fields, 'unpaid'),
    last_lesson: flag(fields, 'last_lesson'),
  }
  const status = oneOf(fields, 'status', ['booked', 'cancelled', 'excused'] as const)
  if (status === 'booked') {
    return {
      ...lesson,
      status,
      travel_before: count(fields, 'travel_before'),
      travel_after: count(fields, 'travel_after'),
      used: flag(fields, 'used'),
      package_no: count(fields, 'package_no'),
      lesson_in_package: count(fields, 'lesson_in_package'),
    }
  }
  // Cancelled and excused lessons have no travel and no place in the ledger.
  return {
    ...lesson,
    status,
    travel_before: null,
    travel_after: null,
    used: null,
    package_no: null,
    lesson_in_package: null,
  }
}

/** coach_week's answer for the week that starts on `weekStart` (TECH_SPEC §5.1). */
export function parseCoachWeek(json: unknown, weekStart: DateKey): CoachWeek {
  return sevenDays(json).map((fields, index) => ({
    day: dayAt(fields, weekStart, index),
    open: list(fields.open).map(timeRange),
    closed: list(fields.closed).map(timeRange),
    exceptions: list(fields.exceptions).map(coachException),
    lessons: list(fields.lessons).map(coachLesson),
  }))
}
