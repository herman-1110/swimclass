import type { ZhWords } from '@/shared/i18n/words'

import type { logOutWords } from './words'

export default {
  key: 'log-out',
  words: {
    logOut: '登出',
    loggingOut: '正在登出…',
    tryAgain: '再试一次',
    goToStart: '回到首页',
  },
} satisfies ZhWords<typeof logOutWords>
