import { TZDate } from '@date-fns/tz'
import { format, startOfWeek } from 'date-fns'

import { DEMO_NOW } from '@/shared/config/demo'
import { env } from '@/shared/config/env'
import type { Language } from '@/shared/i18n/language'

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
 * (`app_now()`), never the browser's. In demo mode both stand still at DEMO_NOW.
 */
export function nowMyt(): TZDate {
  // The build-time constant first, so a production build folds this to the real clock and
  // leaves DEMO_NOW out; env.demo after it lets the unit tests switch demo mode off.
  return import.meta.env.VITE_DEMO === 'true' && env.demo ? toMyt(DEMO_NOW) : TZDate.tz(MYT)
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

/**
 * The value when it is a real date written "yyyy-MM-dd" ("2026-10-03"), otherwise null:
 * missing, empty (a cleared date field), another format, or a day that doesn't exist
 * ("2026-02-30"). For dates from the address or a form.
 */
export function parseDateKey(value: string | null | undefined): DateKey | null {
  if (value == null || !DATE_KEY.test(value)) return null
  try {
    mytInstant(value, '12:00')
    return value
  } catch {
    return null
  }
}

/** The Monday (ISO week start) of the MYT week that contains the moment or date. */
export function mytWeekStart(value: Instant | DateKey): DateKey {
  const day = typeof value === 'string' && DATE_KEY.test(value) ? mytInstant(value, '12:00') : value
  return format(startOfWeek(toMyt(day), { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

// Chinese (the student screens, Herman 7 Oct 2026): the period word goes first, "上午7:30",
// "下午5:00", "晚上7:30" (from 6 pm); days are "10月3日 周六" (frontend-plan/notes/i18n-glossary.md).
const ZH_WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function zhPeriod(time: TZDate): string {
  const hour = time.getHours()
  return hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上'
}

/** "周六": a moment's weekday in Chinese. */
export function zhWeekday(instant: Instant): string {
  return ZH_WEEKDAYS[toMyt(instant).getDay()] ?? ''
}

/** "7:30 pm", "12:00 pm" (noon), "12:00 am" (midnight); Chinese "晚上7:30", "下午12:00". */
export function formatTime(instant: Instant, language: Language = 'en'): string {
  const time = toMyt(instant)
  return language === 'zh' ? `${zhPeriod(time)}${format(time, 'h:mm')}` : format(time, 'h:mm aaa')
}

/** "Sat 3 Oct"; Chinese "10月3日 周六". */
export function formatDay(instant: Instant, language: Language = 'en'): string {
  const day = toMyt(instant)
  return language === 'zh' ? `${format(day, 'M月d日')} ${zhWeekday(day)}` : format(day, 'EEE d MMM')
}

// A date column ("2026-09-19") is read at noon Malaysia time, so it names that day in any
// time zone; anything else is a moment.
function dayOf(value: Instant | DateKey): TZDate {
  return typeof value === 'string' && DATE_KEY.test(value)
    ? toMyt(mytInstant(value, '12:00'))
    : toMyt(value)
}

/**
 * A day as "26 Sep", from a moment or a date column ("2026-09-19"), in Malaysia time. With
 * `now`, a day in another year shows the year too: "18 Dec 2025".
 */
export function formatDayMonth(
  value: Instant | DateKey,
  now?: Instant,
  language: Language = 'en',
): string {
  const day = dayOf(value)
  const sameYear = now === undefined || toMyt(now).getFullYear() === day.getFullYear()
  if (language === 'zh') return format(day, sameYear ? 'M月d日' : 'yyyy年M月d日')
  return format(day, sameYear ? 'd MMM' : 'd MMM yyyy')
}

/** A day with its year, "19 Sep 2026" (Chinese "2026年9月19日"), from a moment or a date column. */
export function formatDayMonthYear(value: Instant | DateKey, language: Language = 'en'): string {
  return format(dayOf(value), language === 'zh' ? 'yyyy年M月d日' : 'd MMM yyyy')
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The MYT date `days` days after `date` (before it when negative): ("2026-09-28", 7) →
 * "2026-10-05". MYT has no daylight saving, so a day is always 24 hours; counting from
 * noon keeps every step inside the right day.
 */
export function addDays(date: DateKey, days: number): DateKey {
  return mytDateKey(mytInstant(date, '12:00').getTime() + days * DAY_MS)
}

/** The seven dates of the week that starts on `weekStart` (a Monday), Monday first. */
export function weekDays(weekStart: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
}

/**
 * A time range with an en dash. The am/pm is written once when both ends share it:
 * "9:00–10:00 am", "5:30–6:30 pm", and on both ends when they don't: "11:00 am–12:00 pm".
 * Chinese puts the period word first, once when both ends share it: "晚上7:30–8:30",
 * "上午11:00–下午12:00".
 */
export function formatRange(start: Instant, end: Instant, language: Language = 'en'): string {
  const from = toMyt(start)
  const to = toMyt(end)
  if (language === 'zh') {
    const fromPeriod = zhPeriod(from)
    const toPeriod = zhPeriod(to)
    const until = toPeriod === fromPeriod ? format(to, 'h:mm') : formatTime(to, 'zh')
    return `${formatTime(from, 'zh')}–${until}`
  }
  const fromHalf = format(from, 'aaa')
  const toHalf = format(to, 'aaa')
  if (fromHalf === toHalf) {
    return `${format(from, 'h:mm')}–${format(to, 'h:mm')} ${toHalf}`
  }
  return `${formatTime(from)}–${formatTime(to)}`
}
