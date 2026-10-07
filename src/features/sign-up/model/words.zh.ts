import type { ZhWords } from '@/shared/i18n/words'

import type { signUpWords } from './words'

export default {
  key: 'sign-up',
  words: {
    username: '用户名',
    usernameHelp: '3 到 30 个小写字母、数字、点或下划线。登录时会用到。',
    checking: '正在检查…',
    available: '这个用户名可以用。',
    name: '名字',
    nameHelp: '你自己的名字。学员由教练添加。',
    email: '电子邮件',
    emailHelp: '我们会发一个链接到这个电子邮件，用来确认。',
    phone: '电话（选填）',
    password: '密码',
    passwordHelp: (min) => `至少 ${min} 个字符。`,
    confirm: '确认密码',
    create: '创建账户',
    creating: '正在创建账户…',
  },
} satisfies ZhWords<typeof signUpWords>
