import { defineWords } from '@/shared/i18n/words'

// Lesson rows on My classes. Chinese in words.zh.ts (HANDOFF v0.26); the coach's History and
// lesson details stay English. Dates and times come in already written in the screen's
// language.
export const bookingWords = defineWords('booking', {
  /** "Today, 5:00–6:00 pm". */
  today: (range: string) => `Today, ${range}`,
  /** "Sat 3 Oct, 9:00–10:00 am". */
  dayRange: (day: string, range: string) => `${day}, ${range}`,
  /** A day in another year: "Fri 12 Dec 2025". */
  dayInYear: (day: string, year: number) => `${day} ${year}`,
  packageName: (no: number) => `Package ${no}`,
  /** "lesson 2 of 4". */
  lessonOf: (lesson: number, size: number) => `lesson ${lesson} of ${size}`,
  /** A 2-hour lesson: "lessons 1–2 of 4". */
  lessonsOf: (first: number, last: number, size: number) => `lessons ${first}–${last} of ${size}`,
  /** A 2-hour lesson on a package's last lesson. */
  acrossPackages: (no: number) => `last lesson of Package ${no} and first of Package ${no + 1}`,
  /** Between the package and the lesson numbers: "Package 2, lesson 2 of 4". */
  positionSeparator: ', ',
  done: 'Done',
  cancelled: 'Cancelled',
  excused: 'Excused',
  excusedNote: 'Your coach excused it, so it doesn’t count.',
  /** "Cancelled by you on 26 Sep.", "Cancelled by your coach on 26 Sep. Reason: Pool closed". */
  cancelledNote: (byYou: boolean, on: string | null, reason: string | null) =>
    `Cancelled by ${byYou ? 'you' : 'your coach'}${on === null ? '' : ` on ${on}`}.${reason === null ? '' : ` Reason: ${reason}`}`,
})

export type BookingWords = typeof bookingWords.en
