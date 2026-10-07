import type { Language } from '@/shared/i18n/language'
import {
  addDays,
  type DateKey,
  formatDay,
  formatRange,
  formatTime,
  type Instant,
  mytInstant,
  toMyt,
  zhWeekday,
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

/**
 * The customer grid's hour lines (design/Schedule.dc.html): "7am", "12pm", "12am". Chinese
 * uses the 24-hour clock, "7:00", "12:00", "19:00": with the period word ("上午10") two of
 * them took two lines in the phone's 34 px column.
 */
export function customerHourLabel(minute: number, language: Language = 'en'): string {
  if (language === 'zh') return `${Math.floor(minute / 60) % 24}:00`
  const { hour, half } = clock(minute)
  return `${hour}${half}`
}

/** The coach grid's hour lines (design/AdminSchedule.dc.html): "7 am", "12 pm". */
export function coachHourLabel(minute: number): string {
  const { hour, half } = clock(minute)
  return `${hour} ${half}`
}

/** A date: "Sat 3 Oct"; Chinese "10月3日 周六". */
export function formatDayKey(day: DateKey, language: Language = 'en'): string {
  // Noon MYT names the right day whatever the device's zone.
  return formatDay(mytInstant(day, '12:00'), language)
}

/**
 * A date's parts in Chinese, from the date itself (its formatDayKey, "10月3日 周六", doesn't
 * split as the English does): weekday "周六", date "3", month "10".
 */
function zhParts(day: DateKey) {
  const noon = toMyt(mytInstant(day, '12:00'))
  return {
    weekday: zhWeekday(noon),
    date: String(noon.getDate()),
    month: String(noon.getMonth() + 1),
  }
}

/** A date's parts: "Sat 3 Oct" → weekday "Sat", date "3", month "Oct". */
function parts(day: DateKey) {
  const [weekday, date, month] = formatDayKey(day).split(' ')
  return { weekday, date, month }
}

/** A day header's two parts: { weekday: "Mon", date: "28" }; Chinese { "周一", "28" }. */
export function dayHeading(
  day: DateKey,
  language: Language = 'en',
): { weekday: string; date: string } {
  const { weekday, date } = language === 'zh' ? zhParts(day) : parts(day)
  return { weekday, date }
}

/** A day button's date as the coach's day strip shows it: "Sat 3". */
export function dayButtonDate(day: DateKey): string {
  const { weekday, date } = parts(day)
  return `${weekday} ${date}`
}

/** A date with its whole weekday: "Saturday 3 Oct" (the coach's day view title). */
export function formatDayLong(day: DateKey): string {
  const { weekday, date, month } = parts(day)
  return `${LONG_WEEKDAYS[weekday]} ${date} ${month}`
}

/**
 * The customer's week (design/Schedule.dc.html, Main.dc.html): "28 Sep – 4 Oct", and inside
 * one month "21–27 Sep", the coach's pattern without the year (triage 10). Chinese
 * "9月28日 – 10月4日", inside one month "9月21日–27日".
 */
export function formatWeekLabel(weekStart: DateKey, language: Language = 'en'): string {
  if (language === 'zh') {
    const [first, last] = [zhParts(weekStart), zhParts(addDays(weekStart, 6))]
    if (first.month === last.month) return `${first.month}月${first.date}日–${last.date}日`
    return `${first.month}月${first.date}日 – ${last.month}月${last.date}日`
  }
  const first = parts(weekStart)
  const last = parts(addDays(weekStart, 6))
  if (first.month === last.month) return `${first.date}–${last.date} ${last.month}`
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
