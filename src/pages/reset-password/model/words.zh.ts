import type { ZhWords } from '@/shared/i18n/words'

import type { resetPageWords } from './words'

export default {
  key: 'page-reset-password',
  words: {
    title: '设置新密码',
    yourUsernameIs: '你的用户名是 ',
    chooseAfterUsername: '。请选择新密码。',
    choose: '请选择新密码。',
    loading: '正在加载…',
    expiredTitle: '这个链接已经失效',
    expiredDescription: '重设链接只能用一次，过一段时间也会失效。请重新申请一个。',
    askNew: '重新申请链接',
    backToLogIn: '返回登录',
    savedTitle: '新密码已保存',
    signedInAs: (username) => `你已登录为 ${username}。`,
    continue: '继续',
  },
} satisfies ZhWords<typeof resetPageWords>
