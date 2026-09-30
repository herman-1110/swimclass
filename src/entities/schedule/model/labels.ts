import {
  addDays,
  type DateKey,
  formatDay,
  formatRange,
  formatTime,
  type Instant,
  mytInstant,
  toMyt,
} from '@/shared/lib/time'

// Words for the week views, built from shared/lib/time's own formats ("Sat 3 Oct",
// "7:30 pm"), so every date and time is read in Malaysia time (CLAUDE.md rule 2).

const LONG_WEEKDAYS: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
}

function clock(minute: number) {
  const hour = Math.floor(minute / 60) % 24
  return { hour: hour % 12 === 0 ? 12 : hour % 12, half: hour < 12 ? 'am' : 'pm' }
}

/** The customer grid's hour lines (design/Schedule.dc.html): "7am", "12pm", "12am". */
export function customerHourLabel(minute: number): string {
  const { hour, half } = clock(minute)
  return `${hour}${half}`
}

/** The coach grid's hour lines (design/AdminSchedule.dc.html): "7 am", "12 pm". */
export function coachHourLabel(minute: number): string {
  const { hour, half } = clock(minute)
  return `${hour} ${half}`
}

/** A date: "Sat 3 Oct". */
export function formatDayKey(day: DateKey): string {
  // Noon MYT names the right day whatever the device's zone.
  return formatDay(mytInstant(day, '12:00'))
}

/** A date's parts: "Sat 3 Oct" → weekday "Sat", date "3", month "Oct". */
function parts(day: DateKey) {
  const [weekday, date, month] = formatDayKey(day).split(' ')
  return { weekday, date, month }
}

/** A day header's two parts: { weekday: "Mon", date: "28" }. */
export function dayHeading(day: DateKey): { weekday: string; date: string } {
  const { weekday, date } = parts(day)
  return { weekday, date }
}

/** A date with its whole weekday: "Saturday 3 Oct" (the coach's day view title). */
export function formatDayLong(day: DateKey): string {
  const { weekday, date, month } = parts(day)
  return `${LONG_WEEKDAYS[weekday]} ${date} ${month}`
}

/**
 * The customer's week (design/Schedule.dc.html, Main.dc.html): "28 Sep – 4 Oct", and the
 * same pattern inside one month, "21 Sep – 27 Sep" (customer-schedule Q12, book Q2).
 */
export function formatWeekLabel(weekStart: DateKey): string {
  const first = parts(weekStart)
  const last = parts(addDays(weekStart, 6))
  return `${first.date} ${first.month} – ${last.date} ${last.month}`
}

/**
 * The coach's week, with its year (design/AdminSchedule.dc.html): "28 Sep – 4 Oct 2026";
 * inside one month "21–27 Sep 2026"; across two years "28 Dec 2026 – 3 Jan 2027"
 * (coach-schedule §3.2).
 */
export function formatCoachWeekLabel(weekStart: DateKey): string {
  const lastDay = addDays(weekStart, 6)
  const [first, last] = [parts(weekStart), parts(lastDay)]
  const [firstYear, lastYear] = [weekStart, lastDay].map((day) =>
    toMyt(mytInstant(day, '12:00')).getFullYear(),
  )
  if (firstYear !== lastYear) {
    return `${first.date} ${first.month} ${firstYear} – ${last.date} ${last.month} ${lastYear}`
  }
  if (first.month !== last.month) {
    return `${first.date} ${first.month} – ${last.date} ${last.month} ${lastYear}`
  }
  return `${first.date}–${last.date} ${last.month} ${lastYear}`
}

/**
 * A lesson's time in a coach grid block (coach-schedule §9 C6): formatRange when both ends
 * share am or pm ("9:00–10:00 am"); otherwise whole hours drop ":00", as drawn
 * ("11 am–12 pm", "10 am–12 pm", "11:30 am–12:30 pm").
 */
export function formatRangeCompact(start: Instant, end: Instant): string {
  const [from, to] = [formatTime(start), formatTime(end)]
  if (from.slice(-2) === to.slice(-2)) return formatRange(start, end)
  const short = (time: string) => time.replace(':00 ', ' ')
  return `${short(from)}–${short(to)}`
}
