import type { ZhWords } from '@/shared/i18n/words'

import type { accountPageWords } from './words'

export default {
  key: 'page-account',
  words: {
    title: '账户',
    yourDetails: '你的资料',
    username: '用户名',
    email: '电子邮件',
    changeNote: '如需更改用户名或电子邮件，请联系教练。',
    password: '密码',
    homeScreen: '主屏幕',
    homeScreenIntro: '把这个网站加到手机主屏幕，就可以像应用一样打开。',
    iphone: 'iPhone：在 Safari 里点“分享”，再点“添加到主屏幕”。',
    android: 'Android：在 Chrome 里点 ⋮ 菜单，再点“添加到主屏幕”。',
    backToCoachView: '返回教练页面',
    tryAgain: '再试一次',
    loading: '正在加载…',
  },
} satisfies ZhWords<typeof accountPageWords>
