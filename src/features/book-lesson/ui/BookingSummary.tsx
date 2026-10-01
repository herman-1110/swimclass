import { useState } from 'react'

import type { GroupBalance } from '@/entities/balance'
import type { Group } from '@/entities/group'
import type { PublicSettings } from '@/entities/settings'
import type { Slot } from '@/entities/slot'
import type { DateKey } from '@/shared/lib/time'
import { Button } from '@/shared/ui/Button'
import { Checkbox } from '@/shared/ui/Checkbox'

import { type BookLessonInput, useBookLesson } from '../api/useBookLesson'
import {
  bookedOutcome,
  bookedPackageLine,
  type Choice,
  followChoice,
  type Outcome,
  sameChoice,
} from '../model/outcome'
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
  /**
   * The picked start as the address names it ("19:30"), or null. It outlives `slot` when the
   * refreshed start times no longer have that start, so a refusal of it stays on screen.
   */
  time: string | null
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

/** What Book sends, plus what the outcome needs from the moment it was pressed. */
type Submission = BookLessonInput & {
  /** The group's names: the success panel names the group booked. */
  names: string
  /** The start pressed, and the choice it was pressed for. */
  slot: Slot
  choice: Choice
}

/**
 * The booking summary (DESIGN §4 item 7; design/Main.dc.html:149-162; book spec §5.2–§5.3):
 * the picked lesson and what it uses, "Repeat weekly", the Book button and the cancel
 * note, then the success panel after book_lesson. Title and line are one polite live
 * region; refusals show there too while focus stays on the button (book spec §7.2).
 */
export function BookingSummary(props: BookingSummaryProps) {
  const { group, balance, settings, day, slot, minutes, lastBookableDay } = props
  const choice: Choice = { groupId: group.group_id, day, minutes, time: props.time }
  const [repeat, setRepeat] = useState(false)
  // book_lesson is running ("Booking…"); the refresh after it is not part of it.
  const [submitting, setSubmitting] = useState(false)
  const [kept, setOutcome] = useState<Outcome | null>(null)
  // A new choice dismisses the panel or the refusal for good (book spec §4.4, §5.3.2).
  const outcome = followChoice(kept, choice)
  if (outcome !== kept) setOutcome(outcome)

  const book = useBookLesson<Submission>({
    onBooked: (ids, submission) => {
      setSubmitting(false)
      setOutcome(bookedOutcome(submission, ids.length, choice, balance))
      setRepeat(false)
      props.onBooked()
    },
    onRefused: (error, submission) => {
      setSubmitting(false)
      // A choice left behind while it was booking needs no explanation.
      if (sameChoice(submission.choice, choice)) {
        setOutcome({ kind: 'refused', choice, error, slot: submission.slot })
      }
    },
  })

  const refusal = outcome?.kind === 'refused' ? outcome : null
  // The start it is about: the picked one, or the refused one once the refresh took it away.
  const lesson = slot ?? refusal?.slot ?? null
  const weeks = lesson
    ? repeatWeeks({
        canStillBook: balance.can_still_book,
        lessonsPerBooking: lessonsPerBooking(minutes),
        day: lesson.day,
        lastBookableDay,
      })
    : 0
  const state = bookingSummaryState({
    slot: lesson,
    minutes,
    group,
    balance,
    repeatWeeks: weeks,
    refusal: refusal?.error ?? null,
    messages: {
      gapMinutes: settings.travel_gap_minutes,
      windowWeeks: settings.booking_window_weeks,
    },
  })

  function submit() {
    if (!lesson || !state.canBook || submitting) return
    setSubmitting(true)
    book.mutate({
      groupId: group.group_id,
      startsAt: lesson.starts_at,
      minutes,
      repeatWeeks: repeat && state.showRepeat ? weeks : 1,
      names: group.display_names,
      slot: lesson,
      choice,
    })
  }

  return (
    <SummaryFrame className={props.className}>
      <div aria-live="polite" className="flex flex-col gap-0.5">
        {outcome?.kind === 'booked' ? (
          <BookedText
            heading={outcome.heading}
            when={outcome.when}
            packageLine={bookedPackageLine(outcome, balance)}
          />
        ) : (
          <SummaryText state={state} />
        )}
      </div>
      {outcome?.kind === 'booked' ? (
        <BookedActions
          onBookAnother={() => {
            setOutcome(null)
            props.onBookAnother?.()
          }}
        />
      ) : (
        <>
          {state.showRepeat && lesson && (
            <Checkbox
              id="book-repeat"
              size="md"
              label={repeatLabel(weeks, lesson.day)}
              checked={repeat}
              disabled={submitting}
              onChange={(event) => setRepeat(event.target.checked)}
            />
          )}
          <Button
            size="xl"
            block
            pending={submitting}
            aria-disabled={!state.canBook || submitting || undefined}
            onClick={submit}
          >
            {submitting ? 'Booking…' : state.buttonLabel}
          </Button>
        </>
      )}
      <p className="text-center text-small text-muted">
        {cancelPolicyNote(settings.cancel_cutoff_hours)}
      </p>
    </SummaryFrame>
  )
}
