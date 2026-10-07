import { defineWords } from '@/shared/i18n/words'

// Set a new password, and its results. Chinese in words.zh.ts (HANDOFF v0.26).
export const resetPageWords = defineWords('page-reset-password', {
  title: 'Set a new password',
  yourUsernameIs: 'Your username is ',
  chooseAfterUsername: '. Choose a new password.',
  choose: 'Choose a new password.',
  loading: 'Loading…',
  expiredTitle: 'This link has expired',
  expiredDescription: 'Reset links work once and stop working after a while. Ask for a new one.',
  askNew: 'Ask for a new link',
  backToLogIn: 'Back to log in',
  savedTitle: 'New password saved',
  signedInAs: (username: string) => `You’re signed in as ${username}.`,
  continue: 'Continue',
})

export type ResetPageWords = typeof resetPageWords.en
