import type { ZhWords } from '@/shared/i18n/words'

import type { bookingWords } from './words'

export default {
  key: 'booking',
  words: {
    today: (range) => `今天 ${range}`,
    dayRange: (day, range) => `${day} ${range}`,
    dayInYear: (day, year) => `${year}年${day}`,
    packageName: (no) => `配套 ${no}`,
    lessonOf: (lesson, size) => `第 ${lesson} 节，共 ${size} 节`,
    lessonsOf: (first, last, size) => `第 ${first}–${last} 节，共 ${size} 节`,
    acrossPackages: (no) => `配套 ${no} 的最后一节和配套 ${no + 1} 的第一节`,
    positionSeparator: ' · ',
    done: '已上',
    cancelled: '已取消',
    excused: '已豁免',
    excusedNote: '教练已豁免这节课，所以不算在配套里。',
    cancelledNote: (byYou, on, reason) =>
      `${on === null ? '' : on}由${byYou ? '你' : '教练'}取消。${reason === null ? '' : `原因：${reason}`}`,
  },
} satisfies ZhWords<typeof bookingWords>
