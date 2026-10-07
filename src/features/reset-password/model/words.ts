import { defineWords } from '@/shared/i18n/words'

// The forgot-password and new-password forms. Chinese in words.zh.ts (HANDOFF v0.26).
export const resetPasswordWords = defineWords('reset-password', {
  email: 'Email',
  send: 'Send reset link',
  sending: 'Sending…',
  newPassword: 'New password',
  passwordHelp: (min: number) => `At least ${min} characters.`,
  confirm: 'Confirm new password',
  save: 'Save new password',
  saving: 'Saving…',
})

export type ResetPasswordWords = typeof resetPasswordWords.en
