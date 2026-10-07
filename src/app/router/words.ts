import { defineWords } from '@/shared/i18n/words'

// The loading line and the error page every route can show. Chinese in words.zh.ts (HANDOFF v0.26).
export const routerWords = defineWords('router', {
  loading: 'Loading…',
  errorTitle: 'Something went wrong',
  errorText:
    'This page couldn’t load. Check your connection, then reload the page. If it still doesn’t load, try again in a few minutes.',
  reload: 'Reload the page',
  goToStart: 'Go to the start',
})

export type RouterWords = typeof routerWords.en
