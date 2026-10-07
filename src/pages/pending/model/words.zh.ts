import type { ZhWords } from '@/shared/i18n/words'

import type { pendingPageWords } from './words'

export default {
  key: 'page-pending',
  words: {
    title: '等待教练批准',
    description: '教练需要先批准你的账户，你才能预约。批准后马上就可以预约。',
    signedInAs: (name, username) => `已登录：${name}（${username}）。`,
  },
} satisfies ZhWords<typeof pendingPageWords>
