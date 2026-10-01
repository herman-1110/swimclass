import { useId } from 'react'

import { type CoachWeek, isWeekOf, weekExceptions } from '@/entities/schedule'
import { exceptionLine, exceptionWhen, RemoveExceptionButton } from '@/features/set-time-exception'
import type { DateKey } from '@/shared/lib/time'
import { SectionTitle } from '@/shared/ui/SectionTitle'

type WeekExceptionsProps = {
  /** The Monday of the week shown. */
  weekStart: DateKey
  /** useCoachWeek(weekStart).data: a week kept on screen while the next loads is skipped. */
  week: CoachWeek | undefined
  /**
   * A row went: removed now ("Blocked time removed."), or removed already elsewhere (the
   * generic message, §6.7). Show the words in the notice and move focus there: the row is gone.
   */
  onRemoved: (notice: string) => void
}

/**
 * "Blocked and extra time" (prompt 08 TASK 5: the week's exceptions with Remove; the
 * Schedule spec §3.8, proposed look): each Block time and Open extra time touching the week
 * once, in start order, as "Sat 3 Oct, 7:00–9:00 am" over "Blocked · Pool maintenance".
 * Only while the week has some.
 */
export function WeekExceptions({ weekStart, week, onRemoved }: WeekExceptionsProps) {
  const titleId = useId()
  const exceptions = week && isWeekOf(week, weekStart) ? weekExceptions(week) : []
  if (exceptions.length === 0) return null

  return (
    <section aria-labelledby={titleId} className="flex flex-col">
      <SectionTitle id={titleId} className="mb-1.5">
        Blocked and extra time
      </SectionTitle>
      <ul role="list" className="m-0 flex list-none flex-col p-0">
        {exceptions.map((exception) => (
          <li key={exception.id} className="flex min-h-13 items-center justify-between gap-3">
            {/* The space keeps the two lines apart for screen readers (flex drops it). */}
            <div className="flex min-w-0 flex-col gap-px">
              <span className="text-sm leading-[normal] font-medium">
                {exceptionWhen(exception)}
              </span>{' '}
              <span className="text-small break-words text-muted">{exceptionLine(exception)}</span>
            </div>
            <RemoveExceptionButton exception={exception} onRemoved={onRemoved} onGone={onRemoved} />
          </li>
        ))}
      </ul>
    </section>
  )
}
