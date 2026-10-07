import { defineWords } from '@/shared/i18n/words'

import type { GroupSize } from './types'

// A group's words on the student pages. Chinese in words.zh.ts (HANDOFF v0.26); the coach's
// screens stay English.
export const groupWords = defineWords('group', {
  /** The type, as group_details' type_label writes it: "1-to-2". */
  typeLabel: (size: GroupSize) => `1-to-${size}`,
  /** GroupPicker's legend on Book. */
  legend: 'Who’s this lesson for?',
  /** GroupPicker's help on Book. */
  help: 'Your coach sets up who books together. Ask them if you need a new group.',
})

export type GroupWords = typeof groupWords.en
