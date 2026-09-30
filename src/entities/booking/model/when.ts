import { formatDay, formatRange, type Instant, mytDateKey } from '@/shared/lib/time'

/** Whether two moments fall on the same Malaysia calendar day. */
export function isSameMytDay(a: Instant, b: Instant): boolean {
  return mytDateKey(a) === mytDateKey(b)
}

/**
 * "Sat 3 Oct, 9:00–10:00 am", never "Today": the cancel dialog's title, the Cancel button's
 * name, the coach's excuse options.
 */
export function lessonDateRange(startsAt: Instant, endsAt: Instant): string {
  return `${formatDay(startsAt)}, ${formatRange(startsAt, endsAt)}`
}

/**
 * A lesson row's first line (MyClasses.dc.html:61): "Today, 5:00–6:00 pm" on today's MYT date,
 * otherwise "Sat 3 Oct, 9:00–10:00 am".
 */
export function lessonWhen(startsAt: Instant, endsAt: Instant, now: Instant): string {
  return isSameMytDay(startsAt, now)
    ? `Today, ${formatRange(startsAt, endsAt)}`
    : lessonDateRange(startsAt, endsAt)
}
