import type { ZhWords } from '@/shared/i18n/words'

import type { balanceWords } from './words'

export default {
  key: 'balance',
  words: {
    packageName: (no) => `配套 ${no}`,
    counts: (used, booked, left) =>
      `已上 ${used} · 已预约 ${booked} · ${left > 0 ? `可预约 ${left}` : '已约满'}`,
    laterCounts: (booked, left) => `已预约 ${booked} · ${left > 0 ? `可预约 ${left}` : '已约满'}`,
    paid: '已付款',
    unpaid: '未付款',
    unpaidPill: (no) => `配套 ${no} 未付款`,
    howToPay: '付款方式：',
    bookNote: (no, price) =>
      `新的预约从配套 ${no} 开始。请在这个配套的第一节课之前或当天${price === null ? '付款' : `付 ${price}`}。`,
    nextStarts: (after, names, type, no, price) =>
      `${after === null ? '' : `${after}之后，`}${names} 的下一节${type}课从配套 ${no} 开始。请在这个配套的第一节课之前或当天${price === null ? '付款' : `付 ${price}`}。`,
    nextUnpaid: (after, names, type) =>
      `${after === null ? '' : `${after}之后，`}${names} 的下一节${type}课还没付款。请在那节课之前或当天付款。`,
    unpaidAhead: (no, price) =>
      `配套 ${no} 还没付款。请在这个配套的第一节课之前或当天${price === null ? '付款' : `付 ${price}`}。`,
    unpaidNow: (no, price) =>
      `配套 ${no} 还没付款。请尽快${price === null ? '付款给教练' : `付 ${price} 给教练`}。`,
  },
} satisfies ZhWords<typeof balanceWords>
