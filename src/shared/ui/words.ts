import { defineWords } from '@/shared/i18n/words'

// The kit's own words: the names it gives its controls for screen readers, and the few it
// shows. Chinese in words.zh.ts (HANDOFF v0.26); the coach's screens stay English.
export const uiWords = defineWords('ui', {
  /** DayStrip's name for its buttons without a heading. */
  days: 'Days',
  /** WeekNav's group. */
  week: 'Week',
  previousWeek: 'Previous week',
  nextWeek: 'Next week',
  today: 'Today',
  /** Legend's list. */
  legend: 'Legend',
  /** Dialog's way out. */
  close: 'Close',
})

export type UiWords = typeof uiWords.en
