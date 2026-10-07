import { defineWords } from '@/shared/i18n/words'

// Sign up, and its "Confirm your email" result. Chinese in words.zh.ts (HANDOFF v0.26).
export const signUpPageWords = defineWords('page-signup', {
  title: 'Create an account',
  description: 'Sign up to book lessons with your coach.',
  haveAccount: 'Already have an account?',
  logIn: 'Log in',
  approvalNote: 'Your coach may need to approve your account before you can book.',
  sentTitle: 'Confirm your email',
  sentDescription:
    'Check your email to confirm, then log in. Your coach may need to approve your account first.',
  sentBefore: 'We sent the link to ',
  sentAfter: '.',
  demoNote: 'Demo mode sends no email, and the address counts as confirmed: you can log in now.',
  backToLogIn: 'Back to log in',
})

export type SignUpPageWords = typeof signUpPageWords.en
