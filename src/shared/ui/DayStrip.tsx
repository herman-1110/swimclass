import { type ReactNode, useId } from 'react'

import { cn } from '@/shared/lib/cn'

export type DayStripDay = {
  /** The day as a DateKey ("2026-09-29"); onSelect gets it back. */
  key: string
  /** "Tue" */
  weekday: string
  /** "29" */
  date: string
  /** The button's name, which contains its text: "Tue 29 Sep, 4 free start times",
   *  "Sat 3, 3 lessons" (WCAG 2.5.3, label in name). */
  label: string
  /** Book: a 4 px accent dot under the date (free start times exist). */
  dot?: boolean
  /** Book: the date in muted grey (no free start time). */
  dimmed?: boolean
  /** Coach: a 10 px line under the date instead of the dot ("3 lessons"). */
  caption?: string
  /** A day that can't be picked (Book: days already past). */
  disabled?: boolean
}

type DayStripProps = {
  /** The 7 days of the week, Monday first. */
  days: readonly DayStripDay[]
  /** The key of the picked day. */
  selected: string
  onSelect: (key: string) => void
  /** Book: "Day" over the strip, with the week range on the right (its text, or a WeekNav).
   *  The heading's label names the group of day buttons. */
  heading?: { label: string; range: ReactNode }
  /** Names the group when there is no heading ("Days" on the coach's phone schedule). */
  label?: string
}

/**
 * A week of day buttons (DESIGN §3; design/Main.dc.html "Day", AdminSchedule.dc.html day view):
 * 76 px tall, weekday over a 36 px date circle (accent when picked), then a dot or a caption.
 * Seven equal columns 2 px apart, so each is 44 px wide at 360 px.
 */
export function DayStrip({ days, selected, onSelect, heading, label = 'Days' }: DayStripProps) {
  const headingId = useId()
  const rangeIsText = typeof heading?.range === 'string'
  return (
    <div className="flex flex-col gap-1.5">
      {heading && (
        <div
          className={cn(
            'flex justify-between gap-2',
            rangeIsText ? 'items-baseline' : 'items-center',
          )}
        >
          <span id={headingId} className="text-label font-medium text-muted">
            {heading.label}
          </span>
          {rangeIsText ? (
            <span className="text-label text-muted">{heading.range}</span>
          ) : (
            heading.range
          )}
        </div>
      )}
      <div
        role="group"
        aria-labelledby={heading ? headingId : undefined}
        aria-label={heading ? undefined : label}
        className="grid grid-cols-7 gap-0.5"
      >
        {days.map((day) => {
          const on = day.key === selected
          return (
            <button
              key={day.key}
              type="button"
              aria-pressed={on}
              aria-label={day.label}
              disabled={day.disabled}
              onClick={() => onSelect(day.key)}
              className="flex h-19 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 bg-transparent disabled:cursor-default"
            >
              <span className="text-small text-muted">{day.weekday}</span>{' '}
              {/* The space shows nowhere (a flex column drops it) but makes the text "Mon 5",
                  which the label "Mon 5 Oct, …" contains (WCAG 2.5.3, label in name). */}
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full text-base',
                  on
                    ? 'bg-accent font-semibold text-white'
                    : day.dimmed || day.disabled
                      ? 'font-medium text-muted'
                      : 'font-medium text-ink',
                )}
              >
                {day.date}
              </span>
              {/* Likewise a space before the caption: "Sat 3 3 lessons" for "Sat 3, 3 lessons". */}
              {day.caption !== undefined ? (
                <>
                  {' '}
                  <span className="text-[0.625rem] whitespace-nowrap text-muted">
                    {day.caption}
                  </span>
                </>
              ) : (
                <span
                  className={cn(
                    'size-1 rounded-full',
                    day.dot && !day.disabled ? 'bg-accent' : 'bg-transparent',
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
