import { useState } from 'react'

import { type GroupBalance, packageCaption } from '@/entities/balance'
import type { Group } from '@/entities/group'
import type { PublicSettings } from '@/entities/settings'
import type { Slot } from '@/entities/slot'
import type { DateKey } from '@/shared/lib/time'
import { Button } from '@/shared/ui/Button'
import { Checkbox } from '@/shared/ui/Checkbox'

import { useBookLesson } from '../api/useBookLesson'
import { bookedOutcome, choiceKey, type Outcome } from '../model/outcome'
import { lessonsPerBooking, repeatLabel, repeatWeeks } from '../model/repeatWeeks'
import { bookingSummaryState, cancelPolicyNote } from '../model/summary'
import { BookedActions, BookedText } from './BookedPanel'
import { SummaryFrame } from './SummaryFrame'
import { SummaryText } from './SummaryText'

type BookingSummaryProps = {
  /** The chosen group (an active one). */
  group: Group
  /** That group's package balance. */
  balance: GroupBalance
  settings: Pick<
    PublicSettings,
    'travel_gap_minutes' | 'booking_window_weeks' | 'cancel_cutoff_hours'
  >
  /** The chosen day, or null while the opening day is still being worked out. */
  day: DateKey | null
  /** The picked start, free or crossed out, or null. */
  slot: Slot | null
  /** The lesson's length in minutes. */
  minutes: number
  /** The last day a customer may book (bookableWindow), for "Repeat weekly". */
  lastBookableDay: DateKey
  /** The lessons are booked: the page forgets the picked time (?time). */
  onBooked: () => void
  /** "Book another lesson" was pressed: the page moves focus back to the start times. */
  onBookAnother?: () => void
  /** Layout only: the page's grid area. */
  className?: string
}

/**
 * The booking summary (DESIGN §4 item 7; design/Main.dc.html:149-162; book spec §5.2–§5.3):
 * the picked lesson and what it uses, "Repeat weekly", the Book button and the cancel
 * note, then the success panel after book_lesson. Title and line are one polite live
 * region; refusals show there too while focus stays on the button (book spec §7.2).
 */
export function BookingSummary(props: BookingSummaryProps) {
  const { group, balance, settings, day, slot, minutes, lastBookableDay } = props
  const [repeat, setRepeat] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const book = useBookLesson({
    onBooked: (ids, input) => {
      setOutcome(bookedOutcome(input, ids.length, group.display_names))
      setRepeat(false)
      props.onBooked()
    },
  })

  const key = choiceKey(group.group_id, day, minutes, slot?.starts_at ?? null)
  const shown = outcome?.key === key ? outcome : null
  const weeks = slot
    ? repeatWeeks({
        canStillBook: balance.can_still_book,
        lessonsPerBooking: lessonsPerBooking(minutes),
        day: slot.day,
        lastBookableDay,
      })
    : 0
  const state = bookingSummaryState({
    slot,
    minutes,
    group,
    balance,
    repeatWeeks: weeks,
    refusal: shown?.kind === 'refused' ? shown.error : null,
    messages: {
      gapMinutes: settings.travel_gap_minutes,
      windowWeeks: settings.booking_window_weeks,
    },
  })

  function submit() {
    if (!slot || !state.canBook) return
    const submitted = key
    book.mutate(
      {
        groupId: group.group_id,
        startsAt: slot.starts_at,
        minutes,
        repeatWeeks: repeat && state.showRepeat ? weeks : 1,
      },
      { onError: (error) => setOutcome({ key: submitted, kind: 'refused', error }) },
    )
  }

  return (
    <SummaryFrame className={props.className}>
      <div aria-live="polite" className="flex flex-col gap-0.5">
        {shown?.kind === 'booked' ? (
          <BookedText
            heading={shown.heading}
            when={shown.when}
            packageLine={book.isPending ? null : packageCaption(balance)}
          />
        ) : (
          <SummaryText state={state} />
        )}
      </div>
      {shown?.kind === 'booked' ? (
        <BookedActions
          onBookAnother={() => {
            setOutcome(null)
            props.onBookAnother?.()
          }}
        />
      ) : (
        <>
          {state.showRepeat && slot && (
            <Checkbox
              id="book-repeat"
              size="md"
              label={repeatLabel(weeks, slot.day)}
              checked={repeat}
              disabled={book.isPending}
              onChange={(event) => setRepeat(event.target.checked)}
            />
          )}
          <Button
            size="xl"
            block
            pending={book.isPending}
            aria-disabled={!state.canBook || book.isPending || undefined}
            onClick={submit}
          >
            {book.isPending ? 'Booking…' : state.buttonLabel}
          </Button>
        </>
      )}
      <p className="text-center text-small text-muted">
        {cancelPolicyNote(settings.cancel_cutoff_hours)}
      </p>
    </SummaryFrame>
  )
}
