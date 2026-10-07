import type { ZhWords } from '@/shared/i18n/words'

import type { groupWords } from './words'

const TYPES = { 1: '一对一', 2: '一对二', 3: '一对三' } as const

export default {
  key: 'group',
  words: {
    typeLabel: (size) => TYPES[size],
    legend: '这节课是给谁上的？',
    help: '哪些学员一起上课由教练安排。如果需要新的小组，请问教练。',
  },
} satisfies ZhWords<typeof groupWords>
