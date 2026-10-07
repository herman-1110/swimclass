import type { ZhWords } from '@/shared/i18n/words'

import type { uiWords } from './words'

export default {
  key: 'ui',
  words: {
    days: '日期',
    week: '周',
    previousWeek: '上一周',
    nextWeek: '下一周',
    today: '今天',
    legend: '图例',
    close: '关闭',
  },
} satisfies ZhWords<typeof uiWords>
