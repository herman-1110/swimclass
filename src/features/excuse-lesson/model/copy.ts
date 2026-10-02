import { lessonDateRange, packagePosition } from '@/entities/booking'
import { formatDay, type Instant, toMyt } from '@/shared/lib/time'

import type { ExcusableLesson, ExcuseCandidate } from './types'

/**
 * An option of "Excuse a missed lesson": the lesson's date and times, with the year when it
 * isn't this year's ("Fri 12 Dec 2025, 7:30–8:30 pm", as History has it), over its place in
 * its package ("Package 2 · lesson 2 of 4"; a line of its own, so it starts with a capital:
 * "Last lesson of Package 2 and first of Package 3").
 */
export function excuseOption(
  lesson: ExcusableLesson,
  packageSize: number,
  now: Instant,
): { when: string; position: string } {
  const position = packagePosition(lesson, packageSize, ' · ')
  return {
    when: lessonDateRange(lesson.starts_at, lesson.ends_at, now),
    position: position.charAt(0).toUpperCase() + position.slice(1),
  }
}

/**
 * Whether the lesson has begun: only then may it be excused (BR-18; a future lesson is
 * cancelled instead). The same rule the database applies (`not_started`), as a preview.
 */
export function hasStarted(lesson: Pick<ExcuseCandidate, 'starts_at'>, now: Instant): boolean {
  return toMyt(now).getTime() >= toMyt(lesson.starts_at).getTime()
}

/** Whether the lesson is over: the lesson details then suggest excusing over cancelling. */
export function hasEnded(lesson: Pick<ExcuseCandidate, 'ends_at'>, now: Instant): boolean {
  return toMyt(now).getTime() >= toMyt(lesson.ends_at).getTime()
}

/** Under "Mark as excused" once the lesson is over (the Schedule spec §6.6, proposed). */
export const ENDED_HINT =
  'This lesson has already happened. If it shouldn’t count, mark it as excused instead of cancelling.'

/** The lesson details' confirmation title (the Schedule spec §7.4, proposed). */
export function excuseTitle(lesson: ExcuseCandidate): string {
  return `Mark ${lessonDateRange(lesson.starts_at, lesson.ends_at)} for ${lesson.display_names} as excused?`
}

/** Under the title: what excusing does (the Schedule spec §7.4, proposed). */
export const EXCUSE_DESCRIPTION =
  'It won’t count against their package. The customer isn’t emailed.'

/** In the lesson details, in place of "Mark as excused" before the lesson starts. */
export const NOT_STARTED_HINT = 'You can mark it as excused once it has started.'

/** The page's notice after "Mark as excused" (the Schedule spec §6.6, proposed). */
export const EXCUSED_NOTICE = 'Lesson marked as excused. It no longer counts.'

/** "Excuse a missed lesson": the rule, above the lessons (the Students spec §5.3 W3). */
export const EXCUSE_HELP =
  'Excused lessons don’t count. Only lessons that have started can be excused.'

/** "Excuse a missed lesson" with nothing to excuse. */
export const NO_LESSONS_TO_EXCUSE =
  'No lessons to excuse. Only lessons that have started can be excused.'

/** The status after "Excuse a missed lesson" worked. */
export const LESSON_EXCUSED = 'Lesson excused.'

/** "Excuse Fri 25 Sep lesson", or "Excuse lesson" until one is picked. */
export function excuseButtonLabel(lesson: Pick<ExcusableLesson, 'starts_at'> | undefined): string {
  return lesson ? `Excuse ${formatDay(lesson.starts_at)} lesson` : 'Excuse lesson'
}
