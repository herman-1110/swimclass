import type { ZhWords } from '@/shared/i18n/words'

import type { bookPageWords } from './words'

export default {
  key: 'page-book',
  words: {
    title: '预约课程',
    hi: (name) => `${name}，你好`,
    loading: '正在加载…',
    tryAgain: '再试一次',
    day: '日期',
    dayPast: (day) => `${day}，已过`,
    dayFull: (day) => `${day}，已约满`,
    dayFree: (day, count) => `${day}，${count} 个空闲时间`,
    lessonLength: '课程时长',
    startTime: '开始时间',
    startTimeOn: (day) => `开始时间 · ${day}`,
    seeWeek: '查看整周',
    loadingTimes: '正在加载开始时间…',
    crossedOutHelp: '划掉的时间和别的课或教练的路程时间冲突。点一下就能看到原因。',
    alreadyBooked: (entries) => `这天已预约：${entries.join('；')}`,
    bookedEntry: (names, range) => `${names}，${range}`,
  },
} satisfies ZhWords<typeof bookPageWords>
