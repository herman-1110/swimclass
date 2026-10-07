import type { ZhWords } from '@/shared/i18n/words'

import type { signUpPageWords } from './words'

export default {
  key: 'page-signup',
  words: {
    title: '创建账户',
    description: '注册后就可以向教练预约课程。',
    haveAccount: '已经有账户？',
    logIn: '登录',
    approvalNote: '你的账户可能需要教练批准后才能预约。',
    sentTitle: '请确认你的电子邮件',
    sentDescription: '请查看电子邮件并点击链接确认，然后登录。你的账户可能需要教练先批准。',
    sentBefore: '我们已把链接发送到 ',
    sentAfter: '。',
    demoNote: '演示模式不会发送电子邮件，这个地址算作已确认：你现在就可以登录。',
    backToLogIn: '返回登录',
  },
} satisfies ZhWords<typeof signUpPageWords>
