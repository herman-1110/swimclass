import type { ZhWords } from '@/shared/i18n/words'

import type { bookLessonWords } from './words'

export default {
  key: 'book-lesson',
  words: {
    pickTitle: '请选择开始时间',
    pickLine: '划掉的时间和别的课或教练的路程时间冲突。',
    pickButton: '选择时间',
    pickFreeButton: '请选一个空闲时间',
    payFirstButton: '请先付清当前配套',
    bookButton: (time, names) => `为 ${names} 预约${time}`,
    booking: '正在预约…',
    summary: '预约摘要',
    usage: (u) => {
      const who = `${u.type} · ${u.names}`
      const notPaid = u.notPaid ? '（还没付款）' : ''
      const later = u.unpaidPackage === null ? '' : ` · 配套 ${u.unpaidPackage} 还没付款`
      if (u.across) {
        return `${who} · 用 ${u.lessons} 节课：配套 ${u.packageNo} 的最后一节和配套 ${u.packageNo + 1} 的第一节${notPaid}${later}`
      }
      const rest =
        u.leftAfter === null
          ? ''
          : u.leftAfter > 0
            ? `，之后还可预约 ${u.leftAfter} 节`
            : '，用完这个配套'
      return `${who} · 用配套 ${u.packageNo} 的 ${u.lessons} 节课${notPaid}${rest}${later}`
    },
    cancelPolicy: (cutoff) =>
      cutoff === null ? '开课前都可以免费取消或改期。' : `开课 ${cutoff}前都可以免费取消或改期。`,
    repeat: (weeks, secondDay) =>
      weeks === 2 ? `每周重复：也预约${secondDay}` : `每周重复，共 ${weeks} 周`,
    booked: (time, names) => `已为 ${names} 预约${time}`,
    bookAnother: '再预约一节课',
    seeMyClasses: '查看我的课程',
  },
} satisfies ZhWords<typeof bookLessonWords>
