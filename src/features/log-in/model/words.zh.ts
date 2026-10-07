import type { ZhWords } from '@/shared/i18n/words'

import type { logInWords } from './words'

export default {
  key: 'log-in',
  words: {
    username: '用户名',
    usernamePlaceholder: '例如 meiling',
    password: '密码',
    passwordPlaceholder: '你的密码',
    logIn: '登录',
    loggingIn: '正在登录…',
    forgot: '忘记用户名或密码？',
  },
} satisfies ZhWords<typeof logInWords>
