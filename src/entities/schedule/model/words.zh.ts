import type { ZhWords } from '@/shared/i18n/words'

import type { scheduleWords } from './words'

export default {
  key: 'schedule',
  words: {
    picture: '一周的时间表，显示空闲、已预约、路程和不开放的时间。“预约”页列出每个空闲的开始时间。',
    bookOn: (day) => `预约${day}`,
    you: '你',
    loading: '正在加载时间表',
    weekText: (week) => `空闲时间和你的课，${week}`,
    free: (from, to) => `${from}到${to}空闲`,
    yourLesson: (from, to) => `你的课${from}到${to}`,
    noFreeTime: '没有空闲时间',
    closed: '不开放',
    dayLine: (day, parts) => `${day}：${parts.join('，')}`,
    legendFree: '空闲',
    legendBooked: '已预约',
    legendTravel: '路程',
    legendYours: '你的课',
    legendClosed: '不开放',
  },
} satisfies ZhWords<typeof scheduleWords>
