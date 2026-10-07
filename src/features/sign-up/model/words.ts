import { defineWords } from '@/shared/i18n/words'

// The sign-up form. Chinese in words.zh.ts (HANDOFF v0.26).
export const signUpWords = defineWords('sign-up', {
  username: 'Username',
  usernameHelp: '3 to 30 small letters, numbers, dots or underscores. You’ll log in with it.',
  checking: 'Checking…',
  available: 'That username is available.',
  name: 'Name',
  nameHelp: 'Your own name. Your coach adds your students.',
  email: 'Email',
  emailHelp: 'We’ll email you a link to confirm it.',
  phone: 'Phone (optional)',
  password: 'Password',
  passwordHelp: (min: number) => `At least ${min} characters.`,
  confirm: 'Confirm password',
  create: 'Create account',
  creating: 'Creating account…',
})

export type SignUpWords = typeof signUpWords.en
