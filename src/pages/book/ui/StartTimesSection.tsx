import { formatDayKey } from '@/entities/schedule'
import { type Slot, TimeChipGrid, TimeChipGridSkeleton } from '@/entities/slot'
import { messagesIn } from '@/shared/config/messages'
import { ROUTES } from '@/shared/config/routes'
import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import { cn } from '@/shared/lib/cn'
import type { DateKey } from '@/shared/lib/time'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { SectionLabel } from '@/shared/ui/SectionLabel'

import type { CoachAway } from '../model/coachAway'
import { bookPageWords } from '../model/words'
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
  /** "Your coach isn’t available …" for Block time on the day (coachAwayText), or null. */
  coachAway: CoachAway | null
  /** Layout only: the page's grid area. */
  className?: string
}

/**
 * "Start time · Tue 29 Sep" (DESIGN §4 item 6; design/Main.dc.html:119-148): "See the week",
 * the coach-away, empty-day and already-booked lines, the Morning and Evening chips and the
 * help line, 14 px apart. Grey chips while the week's start times load; the message and "Try
 * again" if they fail.
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
  coachAway,
  className,
}: StartTimesSectionProps) {
  const language = useLanguage()
  const w = wordsIn(bookPageWords, language)
  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col gap-3.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <SectionLabel as="h2" id={headingId} tabIndex={-1}>
          {day ? w.startTimeOn(formatDayKey(day, language)) : w.startTime}
        </SectionLabel>
        <ButtonLink
          variant="link"
          textSize="label"
          flush
          to={`${ROUTES.schedule}?week=${weekStart}`}
        >
          {w.seeWeek}
        </ButtonLink>
      </div>
      {failure ? (
        <RetryMessage error={failure.error} onRetry={failure.retry} />
      ) : daySlots === null ? (
        <div aria-busy="true">
          <p role="status" className="sr-only">
            {w.loadingTimes}
          </p>
          <TimeChipGridSkeleton />
        </div>
      ) : (
        <>
          {coachAway && <p className="text-label text-ink">{coachAway.text}</p>}
          {!coachAway?.wholeDay && !daySlots.some((slot) => slot.ok) && (
            <p className="text-label text-ink">{messagesIn(language).dayFullyBooked}</p>
          )}
          {/* It names groups: a one-word name of up to 100 characters breaks inside (§6.6). */}
          {alreadyBooked && <p className="text-label wrap-anywhere text-accent">{alreadyBooked}</p>}
          <TimeChipGrid slots={daySlots} selected={selected} onSelect={onSelect} />
        </>
      )}
      <p className="text-small leading-[1.45] text-muted">{w.crossedOutHelp}</p>
    </section>
  )
}
