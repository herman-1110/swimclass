import { defineWords } from '@/shared/i18n/words'

// Forgot password, and its "Check your email" result. Chinese in words.zh.ts (HANDOFF v0.26).
export const forgotPageWords = defineWords('page-forgot-password', {
  title: 'Forgot your username or password?',
  description:
    'Enter the email you signed up with. We’ll send you a link that shows your username and lets you set a new password.',
  backToLogIn: 'Back to log in',
  sentTitle: 'Check your email',
  sentBefore: 'If an account uses ',
  sentAfter: ', we’ve sent it a link to set a new password.',
  demoNote: 'Demo mode sends no email. Log in, then change the password on your Account page.',
})

export type ForgotPageWords = typeof forgotPageWords.en
