import { formatDayKey } from '@/entities/schedule'
import { type Slot, TimeChipGrid, TimeChipGridSkeleton } from '@/entities/slot'
import { DAY_FULLY_BOOKED_MESSAGE } from '@/shared/config/messages'
import { ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import type { DateKey } from '@/shared/lib/time'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { SectionLabel } from '@/shared/ui/SectionLabel'

import { RetryMessage } from './RetryMessage'

type StartTimesSectionProps = {
  /** The heading's id: the page moves focus here after "Book another lesson". */
  headingId: string
  /** The chosen day, or null while the opening day is worked out. */
  day: DateKey | null
  /** The Monday of the week shown ("See the week" opens the Schedule on it). */
  weekStart: DateKey
  /**
   * The chosen day's start times, free and crossed out; null (grey chips) while they, or the
   * day's own lessons for "Already booked", load, or if they failed.
   */
  daySlots: readonly Slot[] | null
  /** The week's start times failed to load: their error, and how to try again. */
  failure: { error: unknown; retry: () => void } | null
  /** The picked start's starts_at, or null. */
  selected: string | null
  onSelect: (slot: Slot) => void
  /** "Already booked this day: …", or null. */
  alreadyBooked: string | null
  /** Layout only: the page's grid area. */
  className?: string
}

/**
 * "Start time · Tue 29 Sep" (DESIGN §4 item 6; design/Main.dc.html:119-148): "See the week",
 * the empty-day and already-booked lines, the Morning and Evening chips and the help line,
 * 14 px apart. Grey chips while the week's start times load; the message and "Try again"
 * if they fail.
 */
export function StartTimesSection({
  headingId,
  day,
  weekStart,
  daySlots,
  failure,
  selected,
  onSelect,
  alreadyBooked,
  className,
}: StartTimesSectionProps) {
  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col gap-3.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <SectionLabel as="h2" id={headingId} tabIndex={-1}>
          {day ? `Start time · ${formatDayKey(day)}` : 'Start time'}
        </SectionLabel>
        <ButtonLink
          variant="link"
          textSize="label"
          flush
          to={`${ROUTES.schedule}?week=${weekStart}`}
        >
          See the week
        </ButtonLink>
      </div>
      {failure ? (
        <RetryMessage error={failure.error} onRetry={failure.retry} />
      ) : daySlots === null ? (
        <div aria-busy="true">
          <p role="status" className="sr-only">
            Loading start times…
          </p>
          <TimeChipGridSkeleton />
        </div>
      ) : (
        <>
          {!daySlots.some((slot) => slot.ok) && (
            <p className="text-label text-ink">{DAY_FULLY_BOOKED_MESSAGE}</p>
          )}
          {alreadyBooked && <p className="text-label text-accent">{alreadyBooked}</p>}
          <TimeChipGrid slots={daySlots} selected={selected} onSelect={onSelect} />
        </>
      )}
      <p className="text-small leading-[1.45] text-muted">
        Crossed-out times clash with another lesson or your coach’s travel time. Tap one to see why.
      </p>
    </section>
  )
}
