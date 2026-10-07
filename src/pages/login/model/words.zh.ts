import type { ZhWords } from '@/shared/i18n/words'

import type { loginPageWords } from './words'

export default {
  key: 'page-login',
  words: {
    title: '欢迎回来',
    description: '登录后可以预约课程和查看配套。',
    newHere: '第一次来？',
    createAccount: '创建账户',
    approvalNote: '你的账户可能需要教练批准后才能预约。',
  },
} satisfies ZhWords<typeof loginPageWords>
