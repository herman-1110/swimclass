import { defineWords } from '@/shared/i18n/words'
import { plural } from '@/shared/lib/format'

// The booking summary and its success panel (book spec §5.2.5, §5.3.2). Chinese in
// words.zh.ts (HANDOFF v0.26). Dates, times and lengths come in already written in the
// screen's language.

/** What a free start uses (usageLine), for the words to put in order. */
export type UsageParts = {
  /** The group's type: "1-to-2". */
  type: string
  names: string
  /** 1 for an hour, 2 for two hours. */
  lessons: number
  /** The package the lesson goes into. */
  packageNo: number
  /** A 2-hour lesson across two packages: the last of packageNo and the first of the next. */
  across: boolean
  /** A lesson it uses isn't paid for. */
  notPaid: boolean
  /** Lessons left to book in the package once it is in, 0 when it fills it; null: not said. */
  leftAfter: number | null
  /** A later package it leaves unpaid (it moves a lesson booked after it past what's paid). */
  unpaidPackage: number | null
}

export const bookLessonWords = defineWords('book-lesson', {
  /** State A: nothing picked yet. */
  pickTitle: 'Pick a start time',
  pickLine: 'Crossed-out times clash with another lesson or travel time.',
  pickButton: 'Pick a time',
  /** A crossed-out start is picked. */
  pickFreeButton: 'Pick a free time',
  /** Too little credit. */
  payFirstButton: 'Pay for the current package first',
  /** "Book 7:30 pm for Aiman & Sofia". */
  bookButton: (time: string, names: string) => `Book ${time} for ${names}`,
  booking: 'Booking…',
  /** The summary's region, for screen readers. */
  summary: 'Booking summary',
  /**
   * "1-to-2 for Aiman & Sofia · uses 1 lesson from Package 4, 1 left to book after this";
   * across two packages "… · uses 2 lessons: the last of Package 1 and the first of Package 2".
   */
  usage: (u: UsageParts) => {
    const who = `${u.type} for ${u.names} · uses ${plural(u.lessons, 'lesson')}`
    const notPaid = u.notPaid ? ', not paid yet' : ''
    const later = u.unpaidPackage === null ? '' : ` · Package ${u.unpaidPackage} isn’t paid yet`
    if (u.across) {
      return `${who}: the last of Package ${u.packageNo} and the first of Package ${u.packageNo + 1}${notPaid}${later}`
    }
    const rest =
      u.leftAfter === null
        ? ''
        : u.leftAfter > 0
          ? `, ${u.leftAfter} left to book after this`
          : ', completes the package'
    return `${who} from Package ${u.packageNo}${notPaid}${rest}${later}`
  },
  /** "Free to cancel or reschedule up to 6 hours before."; null: no cutoff. */
  cancelPolicy: (cutoff: string | null) =>
    cutoff === null
      ? 'Free to cancel or reschedule until the lesson starts.'
      : `Free to cancel or reschedule up to ${cutoff} before.`,
  /** "Repeat weekly: also book Tue 6 Oct" for two weeks, "Repeat weekly for 4 weeks". */
  repeat: (weeks: number, secondDay: string) =>
    weeks === 2 ? `Repeat weekly: also book ${secondDay}` : `Repeat weekly for ${weeks} weeks`,
  /** The success panel's heading: "Booked 7:30 pm for Aiman & Sofia". */
  booked: (time: string, names: string) => `Booked ${time} for ${names}`,
  bookAnother: 'Book another lesson',
  seeMyClasses: 'See My classes',
})

export type BookLessonWords = typeof bookLessonWords.en
