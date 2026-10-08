import { lessonDateRange } from '@/entities/booking'
import type { Language } from '@/shared/i18n/language'
import { wordsIn } from '@/shared/i18n/words'

import type { CancelableLesson, CancelAudience } from './types'
import { cancelLessonWords } from './words'

type Timed = Pick<CancelableLesson, 'starts_at' | 'ends_at'>

/** "Sat 3 Oct, 9:00–10:00 am": always the date, never "Today" (the My classes spec §2.6). */
function lessonWhen(lesson: Timed, language: Language): string {
  return lessonDateRange(lesson.starts_at, lesson.ends_at, undefined, language)
}

/** The Cancel button's full name: "Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia". */
export function cancelLabel(
  lesson: Timed & Pick<CancelableLesson, 'display_names'>,
  language: Language = 'en',
): string {
  const w = wordsIn(cancelLessonWords, language)
  return w.cancelLabel(lessonWhen(lesson, language), lesson.display_names)
}

/** The confirmation's title: "Cancel Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia?". */
export function cancelTitle(
  lesson: Timed & Pick<CancelableLesson, 'display_names'>,
  language: Language = 'en',
): string {
  const w = wordsIn(cancelLessonWords, language)
  return w.title(lessonWhen(lesson, language), lesson.display_names)
}

/** What happens to the lesson, under the title (the My classes spec §2.6; prompt 08 TASK 4). */
export function cancelDescription(audience: CancelAudience, language: Language = 'en'): string {
  return audience === 'coach'
    ? 'The lesson goes back to their package and the customer is emailed.'
    : wordsIn(cancelLessonWords, language).description
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
export function cancelledNotice(
  lesson: CancelableLesson,
  audience: CancelAudience,
  language: Language = 'en',
): string {
  if (audience === 'coach') {
    const who = lesson.account_name?.trim() || 'The customer'
    return `Lesson cancelled. ${who} will get an email.`
  }
  const w = wordsIn(cancelLessonWords, language)
  return w.notice(lessonWhen(lesson, language), lesson.display_names)
}
