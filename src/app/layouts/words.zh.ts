import type { ZhWords } from '@/shared/i18n/words'

import type { layoutWords } from './words'

export default {
  key: 'layouts',
  words: {
    book: '预约',
    schedule: '课程表',
    myClasses: '我的课程',
    account: '账户',
    backToCoachView: '返回教练页面',
    main: '主菜单',
    navigation: (label) => `${label}导航`,
    signedInAs: (name) => `已登录：${name}`,
    skipToContent: '跳到主要内容',
  },
} satisfies ZhWords<typeof layoutWords>
