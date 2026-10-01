import { formatDateList } from '@/shared/lib/format'
import { addDays, formatRange, formatTime, mytDateKey } from '@/shared/lib/time'

import { lessonEnd } from './summary'

// The success panel (book spec §5.3.2, proposed: not drawn). The button keeps its name
// through the flow, "Book 7:30 pm for Aiman & Sofia" → "Booked 7:30 pm for Aiman & Sofia"
// (DESIGN §6).

/** "Booked 7:30 pm for Aiman & Sofia". */
export function bookedHeading(startsAt: string, names: string): string {
  return `Booked ${formatTime(startsAt)} for ${names}`
}

/**
 * The lessons booked: "Tue 29 Sep · 7:30–8:30 pm", or for several weeks "Tue 29 Sep, Tue
 * 6 Oct, Tue 13 Oct and Tue 20 Oct · 7:30–8:30 pm". The same MYT time each week, as
 * book_lesson books it (168 hours apart).
 */
export function bookedWhen(startsAt: string, minutes: number, weeks: number): string {
  const first = mytDateKey(startsAt)
  const dates = Array.from({ length: Math.max(1, weeks) }, (_, week) => addDays(first, 7 * week))
  return `${formatDateList(dates)} · ${formatRange(startsAt, lessonEnd(startsAt, minutes))}`
}
