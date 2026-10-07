import { defineWords } from '@/shared/i18n/words'

// The customer's Schedule page. Chinese in words.zh.ts (HANDOFF v0.26).
export const schedulePageWords = defineWords('page-schedule', {
  title: 'Schedule',
  eyebrow: 'Your coach’s timetable',
  footnote: 'Other students’ lessons show as Booked, without names. Tap a day to book it.',
  tryAgain: 'Try again',
})

export type SchedulePageWords = typeof schedulePageWords.en
