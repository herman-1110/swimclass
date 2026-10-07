import type { ZhWords } from '@/shared/i18n/words'

import type { resetPasswordWords } from './words'

export default {
  key: 'reset-password',
  words: {
    email: '电子邮件',
    send: '发送重设链接',
    sending: '正在发送…',
    newPassword: '新密码',
    passwordHelp: (min) => `至少 ${min} 个字符。`,
    confirm: '确认新密码',
    save: '保存新密码',
    saving: '正在保存…',
  },
} satisfies ZhWords<typeof resetPasswordWords>
