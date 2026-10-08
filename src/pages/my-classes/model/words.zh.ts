import type { ZhWords } from '@/shared/i18n/words'

import type { myClassesPageWords } from './words'

export default {
  key: 'page-my-classes',
  words: {
    title: '我的课程',
    account: (name) => `${name} 的账户`,
    upcoming: '即将上的课',
    loadingLessons: '正在加载你的课…',
    noUpcoming: '没有即将上的课。',
    bookLesson: '预约课程',
    packages: '配套',
    loadingPackages: '正在加载你的配套…',
    pastToggle: '过去的课和收据',
    pastHeading: '过去和已取消的课',
    loadingPast: '正在加载过去的课…',
    noPast: '还没有过去或已取消的课。',
    showingLessons: (count) => `只显示最近 ${count} 节课。`,
    payments: '付款记录',
    loadingPayments: '正在加载付款记录…',
    noPayments: '还没有付款记录。',
    showingPayments: (count) => `只显示最近 ${count} 笔付款。`,
    tryAgain: '再试一次',
  },
} satisfies ZhWords<typeof myClassesPageWords>
