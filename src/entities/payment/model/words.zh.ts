import type { ZhWords } from '@/shared/i18n/words'

import type { paymentWords } from './words'

export default {
  key: 'payment',
  words: {
    method: {
      cash: '现金',
      transfer: '转账',
      fpx: 'FPX',
      free: '免费课',
      other: '其他',
    },
    paid: (date, method) => (method === null ? `${date}已付款` : `${date}已付款 · ${method}`),
    free: '免费',
    lessons: (count) => `${count} 节课`,
    startingBalance: '期初余额',
    noneYet: '还没有',
  },
} satisfies ZhWords<typeof paymentWords>
