import { defineWords } from '@/shared/i18n/words'

// The coach's pinned message on the student pages; the message stays as the coach typed it.
// Chinese in words.zh.ts (HANDOFF v0.26).
export const announcementWords = defineWords('announcement', {
  coach: 'Coach:',
})

export type AnnouncementWords = typeof announcementWords.en
