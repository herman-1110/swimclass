import { defineWords } from '@/shared/i18n/words'

// Log in. Chinese in words.zh.ts (HANDOFF v0.26).
export const loginPageWords = defineWords('page-login', {
  title: 'Welcome back',
  description: 'Log in to book lessons and check your package.',
  newHere: 'New here?',
  createAccount: 'Create an account',
  approvalNote: 'Your coach may need to approve your account before you can book.',
})

export type LoginPageWords = typeof loginPageWords.en
