import { TZDate } from '@date-fns/tz'
import { format, startOfWeek } from 'date-fns'

/**
 * Malaysia time. All business dates and all display use this zone (CLAUDE.md rule 2),
 * never the device's own time zone. MYT is UTC+8 all year (no daylight saving).
 */
export const MYT = 'Asia/Kuala_Lumpur'

/**
 * A moment in time: a Date, epoch milliseconds, or an ISO 8601 string with an offset
 * (what Supabase returns for timestamptz, e.g. "2026-10-03T01:00:00+00:00").
 */
export type Instant = Date | number | string

/** A business date in MYT as "yyyy-MM-dd" (what Postgres `date` parameters take). */
export type DateKey = string

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_OF_DAY = /^(\d{2}):(\d{2})(?::\d{2})?$/
// A string must be a date-time that says which moment it means: a time followed by
// "Z" or an offset like +08:00. Date-only strings ("2026-10-03") would parse as UTC
// midnight, which is the wrong day's 8 am in MYT, so they are rejected.
const HAS_OFFSET = /\d{2}:\d{2}(:\d{2}(\.\d+)?)?\s*(Z|[+-]\d{2}(:?\d{2})?)$/i

function toDate(instant: Instant): Date {
  if (typeof instant === 'string' && !HAS_OFFSET.test(instant.trim())) {
    throw new RangeError(
      `"${instant}" has no time zone offset, so it could mean different moments. ` +
        'Pass an ISO string ending in Z or +08:00, or build it with mytInstant().',
    )
  }
  const date = new Date(instant)
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`"${String(instant)}" is not a valid date and time.`)
  }
  return date
}

/** The same moment, as a date whose fields (day, hour, ...) read in Malaysia time. */
export function toMyt(instant: Instant): TZDate {
  return new TZDate(toDate(instant).getTime(), MYT)
}

/**
 * The current moment in MYT, for display only. Business rules use the database clock
 * (`app_now()`), never the browser's.
 */
export function nowMyt(): TZDate {
  return TZDate.tz(MYT)
}

/** The MYT calendar date of a moment: 2026-09-30T17:00Z → "2026-10-01". */
export function mytDateKey(instant: Instant): DateKey {
  return format(toMyt(instant), 'yyyy-MM-dd')
}

/** The moment a wall-clock time happens in MYT: ("2026-10-03", "19:30") → 11:30 UTC. */
export function mytInstant(date: DateKey, time: string): Date {
  const d = DATE_KEY.exec(date)
  const t = TIME_OF_DAY.exec(time)
  if (!d || !t) {
    throw new RangeError(`Expected a date like "2026-10-03" and a time like "19:30".`)
  }
  const [year, month, day] = [Number(d[1]), Number(d[2]), Number(d[3])]
  const [hours, minutes] = [Number(t[1]), Number(t[2])]
  const result = new TZDate(year, month - 1, day, hours, minutes, MYT)
  // Reject impossible dates and times ("2026-02-30", "24:00") instead of rolling over.
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day ||
    result.getHours() !== hours ||
    result.getMinutes() !== minutes
  ) {
    throw new RangeError(`"${date} ${time}" is not a real date and time.`)
  }
  return new Date(result.getTime())
}

/** The Monday (ISO week start) of the MYT week that contains the moment or date. */
export function mytWeekStart(value: Instant | DateKey): DateKey {
  const day = typeof value === 'string' && DATE_KEY.test(value) ? mytInstant(value, '12:00') : value
  return format(startOfWeek(toMyt(day), { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

/** "7:30 pm", "12:00 pm" (noon), "12:00 am" (midnight). */
export function formatTime(instant: Instant): string {
  return format(toMyt(instant), 'h:mm aaa')
}

/** "Sat 3 Oct". */
export function formatDay(instant: Instant): string {
  return format(toMyt(instant), 'EEE d MMM')
}

/**
 * A time range with an en dash. The am/pm is written once when both ends share it:
 * "9:00–10:00 am", "5:30–6:30 pm", and on both ends when they don't: "11:00 am–12:00 pm".
 */
export function formatRange(start: Instant, end: Instant): string {
  const from = toMyt(start)
  const to = toMyt(end)
  const fromHalf = format(from, 'aaa')
  const toHalf = format(to, 'aaa')
  if (fromHalf === toHalf) {
    return `${format(from, 'h:mm')}–${format(to, 'h:mm')} ${toHalf}`
  }
  return `${formatTime(from)}–${formatTime(to)}`
}
