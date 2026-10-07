import type { ZhWords } from '@/shared/i18n/words'

import type { slotWords } from './words'

export default {
  key: 'slot',
  words: {
    morning: '上午',
    evening: '下午和晚上',
    available: (time) => `${time}，可预约`,
    notAvailable: (time) => `${time}，不可预约`,
    unavailableTitle: (time) => `${time}不可预约`,
  },
} satisfies ZhWords<typeof slotWords>
