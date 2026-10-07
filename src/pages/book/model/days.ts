import { dayHeading, formatDayKey } from '@/entities/schedule'
import type { Language } from '@/shared/i18n/language'
import { wordsIn } from '@/shared/i18n/words'
import { type DateKey, weekDays } from '@/shared/lib/time'
import type { DayStripDay } from '@/shared/ui/DayStrip'

import { bookPageWords } from './words'

/**
 * The day strip's seven days (book spec §5.2.2; design/Main.dc.html:315-329): "Tue 29 Sep,
 * 4 free start times" with a dot, "Thu 1 Oct, fully booked" in muted grey, and days already
 * past disabled, "Mon 21 Sep, past" (C20). While the start times load, or if they failed,
 * `counts` is null: the dates show at once, without dots or counts.
 */
export function dayStripDays(
  weekStart: DateKey,
  today: DateKey,
  counts: ReadonlyMap<DateKey, number> | null,
  language: Language = 'en',
): DayStripDay[] {
  const w = wordsIn(bookPageWords, language)
  return weekDays(weekStart).map((key) => {
    const name = formatDayKey(key, language)
    const { weekday, date } = dayHeading(key, language)
    if (key < today) return { key, weekday, date, label: w.dayPast(name), disabled: true }
    if (counts === null) return { key, weekday, date, label: name }
    const free = counts.get(key) ?? 0
    const label = free === 0 ? w.dayFull(name) : w.dayFree(name, free)
    return { key, weekday, date, label, dot: free > 0, dimmed: free === 0 }
  })
}
