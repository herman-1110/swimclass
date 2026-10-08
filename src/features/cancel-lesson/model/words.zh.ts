import type { ZhWords } from '@/shared/i18n/words'

import type { cancelLessonWords } from './words'

export default {
  key: 'cancel-lesson',
  words: {
    cancel: '取消',
    locked: '已锁定',
    cancelLabel: (when, names) => `取消 ${names} ${when}的课`,
    title: (when, names) => `要取消 ${names} ${when}的课吗？`,
    description: '这节课会回到你的配套。',
    cancelLesson: '取消这节课',
    cancelling: '正在取消…',
    keepLesson: '保留这节课',
    close: '关闭',
    notice: (when, names) => `已取消 ${names} ${when}的课。这节课已回到你的配套。`,
    openNote: (time, day) => `${day} ${time}前可以免费取消。`,
    lockedNote: (cutoff) => `离上课不到 ${cutoff}，所以不能取消，缺课也会算一节。`,
    startedNote: '这节课已经开始，所以不能取消，缺课也会算一节。',
  },
} satisfies ZhWords<typeof cancelLessonWords>
