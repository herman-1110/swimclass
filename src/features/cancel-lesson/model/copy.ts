import { formatDay, formatRange } from '@/shared/lib/time'

import type { CancelableLesson, CancelAudience } from './types'

type Timed = Pick<CancelableLesson, 'starts_at' | 'ends_at'>

/** "Sat 3 Oct, 9:00–10:00 am": always the date, never "Today" (the My classes spec §2.6). */
export function lessonWhen(lesson: Timed): string {
  return `${formatDay(lesson.starts_at)}, ${formatRange(lesson.starts_at, lesson.ends_at)}`
}

/** The Cancel button's full name: "Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia". */
export function cancelLabel(lesson: Timed & Pick<CancelableLesson, 'display_names'>): string {
  return `Cancel ${lessonWhen(lesson)} for ${lesson.display_names}`
}

/** The confirmation's title: "Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia?". */
export function cancelTitle(lesson: Timed & Pick<CancelableLesson, 'display_names'>): string {
  return `${cancelLabel(lesson)}?`
}

/** What happens to the lesson, under the title (the My classes spec §2.6; prompt 08 TASK 4). */
export function cancelDescription(audience: CancelAudience): string {
  return audience === 'coach'
    ? 'The lesson goes back to their package and the customer is emailed.'
    : 'The lesson goes back to your package.'
}

/** The coach's reason field's help (the Schedule spec §7.4, proposed). */
export function reasonHelp(lesson: Pick<CancelableLesson, 'account_name'>): string {
  const to = lesson.account_name?.trim() || 'the customer'
  return `Goes in the email to ${to}. Up to 500 characters.`
}

/**
 * What the page says once the lesson is cancelled: "Lesson cancelled: Sat 3 Oct, 9:00–10:00
 * am for Aiman & Sofia. It went back to your package." (My classes §6) or "Lesson
 * cancelled. Mei Ling will get an email." (the Schedule spec §6.6; both proposed).
 */
export function cancelledNotice(lesson: CancelableLesson, audience: CancelAudience): string {
  if (audience === 'coach') {
    const who = lesson.account_name?.trim() || 'The customer'
    return `Lesson cancelled. ${who} will get an email.`
  }
  return `Lesson cancelled: ${lessonWhen(lesson)} for ${lesson.display_names}. It went back to your package.`
}
