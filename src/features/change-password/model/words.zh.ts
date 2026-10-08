import type { ZhWords } from '@/shared/i18n/words'

import type { changePasswordWords } from './words'

export default {
  key: 'change-password',
  words: {
    newPassword: '新密码',
    help: (min) => `至少 ${min} 个字符。`,
    confirm: '确认新密码',
    save: '保存新密码',
    saving: '正在保存…',
    saved: '新密码已保存。',
  },
} satisfies ZhWords<typeof changePasswordWords>
