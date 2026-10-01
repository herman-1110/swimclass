import { formatDayKey } from '@/entities/schedule'
import { plural } from '@/shared/lib/format'
import { type DateKey, weekDays } from '@/shared/lib/time'
import type { DayStripDay } from '@/shared/ui/DayStrip'

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
): DayStripDay[] {
  return weekDays(weekStart).map((key) => {
    const name = formatDayKey(key)
    const [weekday, date] = name.split(' ')
    if (key < today) return { key, weekday, date, label: `${name}, past`, disabled: true }
    if (counts === null) return { key, weekday, date, label: name }
    const free = counts.get(key) ?? 0
    const label = `${name}, ${free === 0 ? 'fully booked' : plural(free, 'free start time')}`
    return { key, weekday, date, label, dot: free > 0, dimmed: free === 0 }
  })
}
