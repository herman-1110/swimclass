import type { ZhWords } from '@/shared/i18n/words'

import type { forgotPageWords } from './words'

export default {
  key: 'page-forgot-password',
  words: {
    title: '忘记用户名或密码？',
    description:
      '请输入你注册时用的电子邮件。我们会发一个链接给你，里面有你的用户名，也可以设置新密码。',
    backToLogIn: '返回登录',
    sentTitle: '请查看电子邮件',
    sentBefore: '如果有账户使用 ',
    sentAfter: '，我们已发送一个链接给它，用来设置新密码。',
    demoNote: '演示模式不会发送电子邮件。请先登录，再到“账户”页面更改密码。',
  },
} satisfies ZhWords<typeof forgotPageWords>
