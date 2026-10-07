import { defineWords } from '@/shared/i18n/words'

// The log-in form. Chinese in words.zh.ts (HANDOFF v0.26).
export const logInWords = defineWords('log-in', {
  username: 'Username',
  usernamePlaceholder: 'e.g. meiling',
  password: 'Password',
  passwordPlaceholder: 'Your password',
  logIn: 'Log in',
  loggingIn: 'Logging in…',
  forgot: 'Forgot username or password?',
})

export type LogInWords = typeof logInWords.en
