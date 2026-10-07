import { defineWords } from '@/shared/i18n/words'

// Logging out. Chinese in words.zh.ts (HANDOFF v0.26).
export const logOutWords = defineWords('log-out', {
  logOut: 'Log out',
  loggingOut: 'Logging out…',
  tryAgain: 'Try again',
  goToStart: 'Go to the start',
})

export type LogOutWords = typeof logOutWords.en
