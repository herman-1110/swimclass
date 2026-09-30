import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { cn } from '@/shared/lib/cn'

import { blockPosition, gridHours, WEEK_GRID_FROM, WEEK_GRID_TO } from './weekGridLayout'

export type WeekGridTone = 'accent' | 'booked-other' | 'travel' | 'closed'

export type WeekGridDay = {
  key: string
  /** "Mon" */
  weekday: string
  /** "28" */
  date: string
  /** The header link's name ("Book on Mon 28 Sep"); in an interactive grid, the name of the
   *  day's list of lessons ("Monday 28 Sep, 1 lesson"). */
  label: string
  /** The header links here (the customer's Book on that day). Leave out for plain text. */
  to?: string
  /** Interactive grid: read before the day's lessons ("Open 5:30–10:00 pm."). */
  summary?: string
}

export type WeekGridBlock = {
  key: string
  /** 0 = the first day (Monday) … 6. */
  column: number
  /** Minutes from the day's midnight (1170 = 7:30 pm); 1440 is the next midnight. */
  start: number
  end: number
  tone: WeekGridTone
  /** What it says: "You", or a lesson's lines. The grid gives it padding and white text on
   *  accent; the caller styles the lines. */
  content?: ReactNode
  /** Makes it a button (interactive grid only): the coach's lesson details. */
  onSelect?: () => void
  /** The button's name when its content doesn't say it all. */
  label?: string
}

type WeekGridProps = {
  /** compact: the customer Schedule (16 px per half hour, 22 px from 768 px). comfortable:
   *  the coach Schedule (56 px per hour). */
  size: 'compact' | 'comfortable'
  /** The 7 days, Monday first. */
  days: readonly WeekGridDay[]
  blocks: readonly WeekGridBlock[]
  /** First and last minute shown, whole hours (weekGridHours). Default 7 am to 10 pm. */
  from?: number
  to?: number
  /** An hour line's label: "7am" (customer), "7 am" (coach). */
  hourLabel: (minute: number) => string
  /** A picture grid: the picture's description. An interactive grid: the region's name
   *  ("Week of 28 Sep – 4 Oct 2026"). */
  label: string
  /** The days become lists of lesson buttons (coach); otherwise the grid is one image. */
  interactive?: boolean
  /** The text alternative (DESIGN §5), visually hidden after the grid: a list of each day. */
  summary?: ReactNode
  /** Drawn over the day columns while loading or after an error; the header stays. */
  overlay?: ReactNode
}

const looks = {
  compact: {
    metrics: '[--row:16px] [--hour:32px] md:[--row:22px] md:[--hour:44px]',
    columns: 'grid-cols-[34px_repeat(7,minmax(0,1fr))] md:grid-cols-[56px_repeat(7,minmax(0,1fr))]',
    head: 'flex min-h-11 flex-col items-center justify-center md:flex-row md:gap-1.5',
    weekday: 'text-[0.6875rem] text-muted md:text-small',
    date: 'text-sm leading-[normal] font-semibold md:text-body',
    body: 'pt-2',
    hour: '-mt-1.5 pr-1.25 text-right text-[0.625rem] text-muted md:pr-2.5 md:text-[0.6875rem]',
    overlay: 'top-2 left-[34px] md:left-14',
    block: 'inset-x-0.5',
    face: 'rounded-sm',
    content: 'px-1 py-0.75 text-[0.625rem] font-semibold md:px-2 md:py-1 md:text-small',
  },
  comfortable: {
    metrics: '[--row:28px] [--hour:56px]',
    columns: 'grid-cols-[48px_repeat(7,minmax(0,1fr))]',
    head: 'flex items-baseline justify-center gap-1.5 px-1 pb-2.5',
    weekday: 'text-small text-muted',
    date: 'text-body font-semibold',
    body: 'pt-2.5',
    hour: '-mt-1.75 pr-2.5 text-right text-[0.6875rem] text-muted',
    overlay: 'top-2.5 left-12',
    block: 'inset-x-0.75',
    face: 'rounded-block',
    content: 'flex flex-col px-2 py-1.25 leading-tight',
  },
}

const tones: Record<WeekGridTone, string> = {
  accent: 'bg-accent text-white',
  'booked-other': 'bg-booked-other',
  travel: 'bg-travel',
  closed: 'bg-closed',
}

// Painting order in a column: closed, travel, others' lessons, then lessons on top (a lesson
// the coach placed in closed time covers it). Lessons follow their start times, which is
// also their focus order.
const layer: Record<WeekGridTone, number> = { closed: 0, travel: 1, 'booked-other': 2, accent: 3 }

/**
 * A week as 7 day columns of blocks on half-hour lines (design/Schedule.dc.html,
 * AdminSchedule.dc.html; DESIGN §4, §5). Blocks sit at their start and end minutes (inline
 * style for the computed position, ARCHITECTURE §3.7), so any minute works. The hour lines
 * and day borders are #F1F1EE (--tag; drawn #F1F1EF).
 */
export function WeekGrid({
  size,
  days,
  blocks,
  from = WEEK_GRID_FROM,
  to = WEEK_GRID_TO,
  hourLabel,
  label,
  interactive = false,
  summary,
  overlay,
}: WeekGridProps) {
  const look = looks[size]
  const height = `calc(${(to - from) / 30} * var(--row))`
  const sorted = blocks.toSorted(
    (a, b) => layer[a.tone] - layer[b.tone] || a.start - b.start || a.end - b.end,
  )
  const Column = interactive ? 'ul' : 'div'
  const Item = interactive ? 'li' : 'div'

  return (
    <div
      role={interactive ? 'region' : undefined}
      aria-label={interactive ? label : undefined}
      className={cn('flex min-w-0 flex-col', look.metrics)}
    >
      <div
        // In an interactive grid each day's list carries the date; plain headers would repeat it.
        aria-hidden={interactive && days.every((day) => !day.to) ? true : undefined}
        className={cn('grid border-b border-line', look.columns)}
      >
        <div />
        {days.map((day) => {
          const text = (
            <>
              <span className={look.weekday}>{day.weekday}</span>{' '}
              <span className={look.date}>{day.date}</span>
            </>
          )
          return day.to ? (
            <Link
              key={day.key}
              to={day.to}
              aria-label={day.label}
              className={cn(look.head, 'text-ink no-underline hover:text-accent-hover')}
            >
              {text}
            </Link>
          ) : (
            <div key={day.key} className={cn(look.head, 'text-ink')}>
              {text}
            </div>
          )
        })}
      </div>
      <div
        role={interactive ? undefined : 'img'}
        aria-label={interactive ? undefined : label}
        className={cn('relative grid', look.columns, look.body)}
      >
        <div aria-hidden="true" className="grid auto-rows-[var(--hour)]" style={{ height }}>
          {gridHours(from, to).map((minute) => (
            <span key={minute} className={look.hour}>
              {hourLabel(minute)}
            </span>
          ))}
        </div>
        {days.map((day, column) => (
          <Column
            key={day.key}
            role={interactive ? 'list' : undefined}
            aria-label={interactive ? day.label : undefined}
            className="relative m-0 list-none border-l border-tag bg-[repeating-linear-gradient(to_bottom,var(--tag)_0,var(--tag)_1px,transparent_1px,transparent_var(--hour))] p-0"
            style={{ height }}
          >
            {interactive && day.summary && <li className="sr-only">{day.summary}</li>}
            {sorted.map((block) => {
              const position = block.column === column && blockPosition(block, from, to)
              if (!position) return null
              const button = interactive && block.onSelect
              const face = cn(
                'overflow-hidden',
                look.face,
                tones[block.tone],
                block.content !== undefined && look.content,
              )
              return (
                <Item
                  key={block.key}
                  aria-hidden={interactive && !button ? true : undefined}
                  className={cn('absolute', look.block, !button && face)}
                  style={position}
                >
                  {button ? (
                    <button
                      type="button"
                      aria-label={block.label}
                      onClick={block.onSelect}
                      className={cn(
                        'size-full cursor-pointer text-left',
                        face,
                        block.tone === 'accent' && 'hover:bg-accent-hover',
                      )}
                    >
                      {block.content}
                    </button>
                  ) : (
                    block.content
                  )}
                </Item>
              )
            })}
          </Column>
        ))}
        {overlay && <div className={cn('absolute right-0 bottom-0', look.overlay)}>{overlay}</div>}
      </div>
      {summary && <div className="sr-only">{summary}</div>}
    </div>
  )
}
