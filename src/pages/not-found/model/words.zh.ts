import type { ZhWords } from '@/shared/i18n/words'

import type { notFoundPageWords } from './words'

export default {
  key: 'page-not-found',
  words: {
    title: '找不到页面',
    description: '这个地址没有页面。请检查链接，或回到首页。',
    goToStart: '回到首页',
  },
} satisfies ZhWords<typeof notFoundPageWords>
