import type { ZhWords } from '@/shared/i18n/words'

import type { schedulePageWords } from './words'

export default {
  key: 'page-schedule',
  words: {
    title: '课程表',
    eyebrow: '教练的时间表',
    footnote: '其他学员的课只显示为“已预约”，不显示名字。点一下日期就可以预约那天。',
    tryAgain: '再试一次',
  },
} satisfies ZhWords<typeof schedulePageWords>
