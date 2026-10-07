import type { ZhWords } from '@/shared/i18n/words'

import type { routerWords } from './words'

export default {
  key: 'router',
  words: {
    loading: '正在加载…',
    errorTitle: '出了点问题',
    errorText: '这个页面无法加载。请检查网络，然后重新加载页面。如果还是不行，请过几分钟再试。',
    reload: '重新加载页面',
    goToStart: '回到首页',
  },
} satisfies ZhWords<typeof routerWords>
