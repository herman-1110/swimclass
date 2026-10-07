import { defineWords } from '@/shared/i18n/words'

// Page not found. Chinese in words.zh.ts (HANDOFF v0.26).
export const notFoundPageWords = defineWords('page-not-found', {
  title: 'Page not found',
  description: 'There’s no page at this address. Check the link, or go back to the start.',
  goToStart: 'Go to the start',
})

export type NotFoundPageWords = typeof notFoundPageWords.en
