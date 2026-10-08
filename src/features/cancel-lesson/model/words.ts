import { defineWords } from '@/shared/i18n/words'

// Cancelling a lesson on My classes. Chinese in words.zh.ts (HANDOFF v0.26); the coach's
// lesson details stay English (their words are in copy.ts). `when` is "Sat 3 Oct,
// 9:00–10:00 am", already in the screen's language.
export const cancelLessonWords = defineWords('cancel-lesson', {
  cancel: 'Cancel',
  locked: 'Locked',
  /** The Cancel button's full name: "Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia". */
  cancelLabel: (when: string, names: string) => `Cancel ${when} for ${names}`,
  /** The confirmation's title. */
  title: (when: string, names: string) => `Cancel ${when} for ${names}?`,
  description: 'The lesson goes back to your package.',
  cancelLesson: 'Cancel lesson',
  cancelling: 'Cancelling…',
  keepLesson: 'Keep lesson',
  close: 'Close',
  /** What the page says once the lesson is cancelled. */
  notice: (when: string, names: string) =>
    `Lesson cancelled: ${when} for ${names}. It went back to your package.`,
  /** The note under a lesson: "Free to cancel until 3:00 am, Sat 3 Oct." */
  openNote: (time: string, day: string) => `Free to cancel until ${time}, ${day}.`,
  /** "Under 6 hours to go, …". */
  lockedNote: (cutoff: string) =>
    `Under ${cutoff} to go, so it can’t be cancelled and counts even if missed.`,
  startedNote: 'It has started, so it can’t be cancelled and counts even if missed.',
})

export type CancelLessonWords = typeof cancelLessonWords.en
