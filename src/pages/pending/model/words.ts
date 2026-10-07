import { defineWords } from '@/shared/i18n/words'

// Waiting for approval. Chinese in words.zh.ts (HANDOFF v0.26).
export const pendingPageWords = defineWords('page-pending', {
  title: 'Waiting for approval',
  description:
    'Your coach needs to approve your account before you can book. You can book as soon as that’s done.',
  signedInAs: (name: string, username: string) => `Signed in as ${name} (${username}).`,
})

export type PendingPageWords = typeof pendingPageWords.en
