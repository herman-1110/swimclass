import { defineWords } from '@/shared/i18n/words'

// Account. Chinese in words.zh.ts (HANDOFF v0.26).
export const accountPageWords = defineWords('page-account', {
  title: 'Account',
  yourDetails: 'Your details',
  username: 'Username',
  email: 'Email',
  changeNote: 'To change your username or email, message your coach.',
  password: 'Password',
  homeScreen: 'Home screen',
  homeScreenIntro: 'Add this site to your phone’s home screen to open it like an app.',
  iphone: 'iPhone: in Safari, tap Share, then Add to Home Screen.',
  android: 'Android: in Chrome, tap the ⋮ menu, then Add to home screen.',
  backToCoachView: 'Back to coach view',
  tryAgain: 'Try again',
  loading: 'Loading…',
})

export type AccountPageWords = typeof accountPageWords.en
