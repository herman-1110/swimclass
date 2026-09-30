import { cn } from '@/shared/lib/cn'
import { type DateKey, formatRange, formatTime } from '@/shared/lib/time'

import { atMinute } from '../model/days'
import { lessonLine, lessonNotes } from '../model/describe'
import type { TimelineItem } from '../model/timeline'
import type { BookedCoachLesson } from '../model/types'

type DayViewItemProps = {
  /** The day the item's minutes count from. */
  day: DateKey
  item: TimelineItem<BookedCoachLesson>
  /** Makes a lesson a button that opens its details; left out, it is plain text. */
  onSelectLesson?: (lesson: BookedCoachLesson) => void
}

// The blocks' looks (design/AdminSchedule.dc.html, the script's LOOK; ui-kit §3.33).
const block = 'flex min-w-0 flex-1 flex-col gap-0.5 rounded-small border'
const time = 'w-15 shrink-0 text-right text-small text-muted'
const others = {
  travel: {
    name: 'Travel',
    block: 'border-travel bg-travel',
    title: 'text-warn',
    line: 'text-warn',
  },
  free: {
    name: 'Free',
    block: 'border-dashed border-field bg-white',
    title: 'text-ink',
    line: 'text-muted',
  },
  closed: {
    name: 'Closed',
    block: 'border-closed bg-closed',
    title: 'text-muted',
    line: 'text-muted',
  },
}

/**
 * One row of the coach's day view: the start time on the left, then a lesson (names, "9:00–10:00
 * am · 1-to-2 · Palm Court", and its flags: "Unpaid", "Last paid lesson", "Gap override"),
 * or a "Travel", "Free" or "Closed" block with its range.
 *
 * The spaces between the parts aren't drawn (flex layout drops them) but keep the words
 * apart for screen readers: "7:00 am Free 7:00–8:00 am".
 */
export function DayViewItem({ day, item, onSelectLesson }: DayViewItemProps) {
  if (item.kind !== 'lesson') {
    const look = others[item.kind]
    const [from, to] = [atMinute(day, item.start), atMinute(day, item.end)]
    return (
      <li className="flex items-start gap-3">
        <span className={cn(time, 'pt-1.75')}>{formatTime(from)}</span>{' '}
        <div className={cn(block, 'px-3 py-1.5', look.block)}>
          <span className={cn('text-small font-semibold', look.title)}>{look.name}</span>{' '}
          <span className={cn('text-small', look.line)}>{formatRange(from, to)}</span>
        </div>
      </li>
    )
  }

  const { lesson } = item
  const notes = lessonNotes(lesson)
  const face = cn(block, 'border-accent bg-accent px-3 py-2.5 text-left')
  const lines = (
    <>
      <span className="text-sm leading-[normal] font-semibold text-white">
        {lesson.display_names}
      </span>{' '}
      <span className="text-small text-on-accent-muted">{lessonLine(lesson)}</span>
      {notes.length > 0 && (
        <>
          {' '}
          <span className="text-small font-semibold text-travel">{notes.join(' · ')}</span>
        </>
      )}
    </>
  )
  return (
    <li className="flex items-start gap-3">
      <span className={cn(time, 'pt-2.75')}>{formatTime(lesson.starts_at)}</span>{' '}
      {onSelectLesson ? (
        <button
          type="button"
          onClick={() => onSelectLesson(lesson)}
          className={cn(face, 'hover:border-accent-hover hover:bg-accent-hover')}
        >
          {lines}
        </button>
      ) : (
        <div className={face}>{lines}</div>
      )}
    </li>
  )
}
