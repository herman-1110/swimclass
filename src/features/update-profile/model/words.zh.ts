import type { ZhWords } from '@/shared/i18n/words'

import type { updateProfileWords } from './words'

export default {
  key: 'update-profile',
  words: {
    name: '名字',
    phone: '电话（选填）',
    save: '保存资料',
    saving: '正在保存…',
    saved: '资料已保存。',
  },
} satisfies ZhWords<typeof updateProfileWords>
