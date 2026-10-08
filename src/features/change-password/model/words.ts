import { defineWords } from '@/shared/i18n/words'

// Account's Password form. Chinese in words.zh.ts (HANDOFF v0.26).
export const changePasswordWords = defineWords('change-password', {
  newPassword: 'New password',
  help: (min: number) => `At least ${min} characters.`,
  confirm: 'Confirm new password',
  save: 'Save new password',
  saving: 'Saving…',
  saved: 'New password saved.',
})

export type ChangePasswordWords = typeof changePasswordWords.en
