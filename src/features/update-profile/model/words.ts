import { defineWords } from '@/shared/i18n/words'

// Account's name and phone. Chinese in words.zh.ts (HANDOFF v0.26).
export const updateProfileWords = defineWords('update-profile', {
  name: 'Name',
  phone: 'Phone (optional)',
  save: 'Save details',
  saving: 'Saving…',
  saved: 'Details saved.',
})

export type UpdateProfileWords = typeof updateProfileWords.en
