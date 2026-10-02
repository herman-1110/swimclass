import { useId, useRef } from 'react'

import { formatLessonPosition } from '@/entities/booking'
import { formatDayKey, useCoachDay } from '@/entities/schedule'
import { type DateKey, formatTime } from '@/shared/lib/time'
import { SectionTitle } from '@/shared/ui/SectionTitle'
import { Skeleton } from '@/shared/ui/Skeleton'

import { LoadError } from './LoadError'

type TodayPanelProps = {
  /** Today in Malaysia (DEMO_NOW's day in demo mode). */
  today: DateKey
}

/**
 * "Today, Sat 26 Sep" (design/AdminSchedule.dc.html L204-218; the Schedule spec §3.5): each
 * of today's lessons in start order with its time, names, "Kiara Park · done" or "Palm
 * Court · 1-to-2, lesson 1 of 4", and "Unpaid, collect today" for a group that owes.
 * Cancelled lessons are left out; excused ones say so. It reads today's week, the same query
 * as the grid when that week is shown.
 */
export function TodayPanel({ today }: TodayPanelProps) {
  const titleId = useId()
  const section = useRef<HTMLElement>(null)
  const day = useCoachDay(today)
  const lessons = day.data?.lessons.filter((lesson) => lesson.status !== 'cancelled') ?? []

  return (
    // Focusable, so "Try again" can hand focus to the lessons that take its place.
    <section
      ref={section}
      tabIndex={-1}
      aria-labelledby={titleId}
      className="flex flex-col gap-3.5"
    >
      <SectionTitle id={titleId}>{`Today, ${formatDayKey(today)}`}</SectionTitle>
      {day.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-3.5">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-11" />
          ))}
          <p role="status" className="sr-only">
            Loading…
          </p>
        </div>
      ) : day.isLoadingError ? (
        // Only a day that never loaded: when a refresh fails, the lessons shown stay, as the
        // week grid's do (the next refresh tries again).
        <LoadError error={day.error} onRetry={() => void day.refetch()} focusAfter={section} />
      ) : lessons.length === 0 ? (
        <p className="text-label text-muted">No lessons today.</p>
      ) : (
        <ul role="list" className="m-0 flex list-none flex-col gap-3.5 p-0">
          {lessons.map((lesson) => (
            // The spaces between the parts aren't drawn (flex layout drops them) but keep the
            // words apart for screen readers: "9:00 am Ethan Kiara Park · done".
            <li key={lesson.booking_id} className="flex gap-3">
              <span className="w-15 shrink-0 text-label text-muted">
                {formatTime(lesson.starts_at)}
              </span>{' '}
              <div className="flex min-w-0 flex-col gap-px">
                <span className="text-sm leading-[normal] font-medium break-words">
                  {lesson.display_names}
                </span>{' '}
                <span className="text-small text-muted">
                  {`${lesson.location} · ${formatLessonPosition(lesson)}`}
                </span>
                {lesson.unpaid && (
                  <>
                    {' '}
                    <span className="text-small font-semibold text-warn">
                      Unpaid, collect today
                    </span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
