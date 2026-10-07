import { defineWords } from '@/shared/i18n/words'

// Book's start times. Chinese in words.zh.ts (HANDOFF v0.26). The chips' English names
// ("7:30 pm, available") are what the tests and frontend-plan/tools find them by.
export const slotWords = defineWords('slot', {
  morning: 'Morning',
  /** From noon: afternoon starts from Open extra time fall here too (book.md C19). */
  evening: 'Evening',
  available: (time: string) => `${time}, available`,
  notAvailable: (time: string) => `${time}, not available`,
  /** Book's summary title for a crossed-out start: "7:00 pm isn’t available". */
  unavailableTitle: (time: string) => `${time} isn’t available`,
})

export type SlotWords = typeof slotWords.en
