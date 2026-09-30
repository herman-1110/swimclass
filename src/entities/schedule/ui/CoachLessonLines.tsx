import { Fragment } from 'react'

import { cn } from '@/shared/lib/cn'
import { mytDateKey } from '@/shared/lib/time'

import { lessonPlace } from '../model/describe'
import { formatDayKey, formatRangeCompact } from '../model/labels'
import type { BookedCoachLesson } from '../model/types'

type CoachLessonLinesProps = {
  lesson: BookedCoachLesson
}

const small = 'truncate text-[0.6875rem]'
const muted = cn(small, 'text-on-accent-muted')
// As drawn, the time may run into the block's right padding ("8:00–9:00 am" fits a 1280 px
// column); what still doesn't fit ends in an ellipsis, not a hard cut (coach-schedule §9 C6).
const time = cn(muted, '-mr-2')
const override = { text: 'Gap override', className: cn(small, 'text-travel') }

/**
 * What a lesson block says in the coach's week grid (design/AdminSchedule.dc.html;
 * coach-schedule §3.3): the names, the time, then the place ("1-to-2 · Palm Court"), "2
 * lessons" for a 2-hour lesson, and "Gap override" where used. A 1-hour block has room
 * for three lines, so there "Gap override" takes the place's line (§9 C4). The place, the
 * date and the payment flags that don't show are read out after the visible lines (§7.2):
 * "Kai, 9:00–10:00 pm, Gap override, Palm Court, Fri 2 Oct".
 */
export function CoachLessonLines({ lesson }: CoachLessonLinesProps) {
  const place = lessonPlace(lesson)
  const overrideInstead = lesson.gap_override && lesson.lessons === 1
  const lines = [
    { text: lesson.display_names, className: 'truncate text-small font-semibold' },
    { text: formatRangeCompact(lesson.starts_at, lesson.ends_at), className: time },
    overrideInstead ? override : { text: place, className: muted },
    ...(lesson.lessons === 2
      ? [
          {
            text: '2 lessons',
            className: 'text-[0.6875rem] whitespace-nowrap text-on-accent-muted',
          },
          ...(lesson.gap_override ? [override] : []),
        ]
      : []),
  ]
  const unseen = [
    overrideInstead ? place : null,
    formatDayKey(mytDateKey(lesson.starts_at)),
    lesson.unpaid ? 'unpaid' : null,
    lesson.last_lesson ? 'last paid lesson' : null,
  ].filter((part) => part !== null)

  return (
    <>
      {/* The spaces between the lines aren't drawn (flex layout drops them), and the commas
          are for screen readers only: the name reads as a list, not one run of words. */}
      {lines.map((line, index) => (
        <Fragment key={index}>
          <span className={line.className}>
            {line.text}
            <span className="sr-only">,</span>
          </span>{' '}
        </Fragment>
      ))}
      <span className="sr-only">{unseen.join(', ')}</span>
    </>
  )
}
