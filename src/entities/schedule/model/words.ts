import { defineWords } from '@/shared/i18n/words'

// The customer's week view (Schedule). Chinese in words.zh.ts (HANDOFF v0.26); the coach's
// week views stay English.
export const scheduleWords = defineWords('schedule', {
  /** The picture's description, as drawn (design/Schedule.dc.html). */
  picture:
    'Week timetable showing free, booked, travel and closed times. The Book tab lists every free start time.',
  /** A day header's link: "Book on Tue 29 Sep". */
  bookOn: (day: string) => `Book on ${day}`,
  /** The viewer's own lesson in the grid. */
  you: 'You',
  loading: 'Loading the timetable',
  /** The grid in words, for screen readers: "Free times and your lessons, 28 Sep – 4 Oct". */
  weekText: (week: string) => `Free times and your lessons, ${week}`,
  free: (from: string, to: string) => `free ${from} to ${to}`,
  yourLesson: (from: string, to: string) => `your lesson ${from} to ${to}`,
  noFreeTime: 'no free time',
  closed: 'closed',
  /** "Tue 29 Sep: free 7:30 pm to 10:00 pm, your lesson …". */
  dayLine: (day: string, parts: readonly string[]) => `${day}: ${parts.join(', ')}`,
  /** The legend, in DESIGN §4's order. */
  legendFree: 'Free',
  legendBooked: 'Booked',
  legendTravel: 'Travel',
  legendYours: 'Yours',
  legendClosed: 'Closed',
})

export type ScheduleWords = typeof scheduleWords.en
