import { defineWords } from '@/shared/i18n/words'
import { plural } from '@/shared/lib/format'

// Book a lesson. Chinese in words.zh.ts (HANDOFF v0.26). Dates and times come in already
// written in the screen's language.
export const bookPageWords = defineWords('page-book', {
  title: 'Book a lesson',
  /** The eyebrow over the title: "Hi, Mei Ling". */
  hi: (name: string) => `Hi, ${name}`,
  loading: 'Loading…',
  tryAgain: 'Try again',
  /** Over the day strip. */
  day: 'Day',
  /** The day strip's buttons: "Tue 29 Sep, past", "…, fully booked", "…, 4 free start times". */
  dayPast: (day: string) => `${day}, past`,
  dayFull: (day: string) => `${day}, fully booked`,
  dayFree: (day: string, count: number) => `${day}, ${plural(count, 'free start time')}`,
  lessonLength: 'Lesson length',
  startTime: 'Start time',
  /** "Start time · Tue 29 Sep". */
  startTimeOn: (day: string) => `Start time · ${day}`,
  seeWeek: 'See the week',
  loadingTimes: 'Loading start times…',
  crossedOutHelp:
    'Crossed-out times clash with another lesson or your coach’s travel time. Tap one to see why.',
  /** "Already booked this day: Aiman & Sofia, 9:00–10:00 am; Sofia, 7:30–8:30 pm". */
  alreadyBooked: (entries: readonly string[]) => `Already booked this day: ${entries.join('; ')}`,
  /** One entry of it: "Aiman & Sofia, 9:00–10:00 am". */
  bookedEntry: (names: string, range: string) => `${names}, ${range}`,
})

export type BookPageWords = typeof bookPageWords.en
