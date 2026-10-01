import { useId, useRef, useState } from 'react'

import { toAppError } from '@/shared/api/rpc'
import { type DateKey, mytDateKey } from '@/shared/lib/time'
import { Dialog } from '@/shared/ui/Dialog'

import { useCoachBook } from '../api/useCoachBook'
import { bookedNotice, NO_EMAIL, primaryLabel } from '../model/copy'
import { type BookingDraft, endOf, lastStartOf } from '../model/draft'
import { BookingActions } from './BookingActions'
import { BookingError } from './BookingError'
import { BookingRules } from './BookingRules'
import { BookingSummary } from './BookingSummary'
import { CheckLine } from './CheckLine'
import { GroupChooser } from './GroupChooser'
import { LengthChoice } from './LengthChoice'
import { useBookingDraft } from './useBookingDraft'
import { WhenFields } from './WhenFields'

/** What the page hears once the lessons are booked. */
export type AddBookingBooked = {
  /** The new bookings, in start order. */
  bookingIds: string[]
  /** The first lesson's day: the page shows its week. */
  firstDate: DateKey
  /** "Booked Tue 29 Sep, 7:30–8:30 pm for Aiman & Sofia." */
  notice: string
}

export type BookingFormProps = {
  onClose: () => void
  defaultDate: DateKey
  onBooked: (booked: AddBookingBooked) => void
}

/**
 * The open Add booking dialog (DESIGN §4 "not drawn"; prompt 08 TASK 5; the Schedule spec
 * §6.4, §7.4): group, date, start, length, repeat and the coach's overrides, the live clash
 * reason for the first week, a summary, then "Book 7:30 pm for Aiman & Sofia". The live
 * check is a preview; `coach_book` decides, and its refusals show above the buttons ("Book
 * anyway" after `credit_exceeded`).
 */
export function BookingForm({ onClose, defaultDate, onBooked }: BookingFormProps) {
  const formId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const form = useBookingDraft(defaultDate)
  const { draft, group, start, minutes, weeks, blocker, gapMinutes } = form
  const book = useCoachBook({
    onBooked: (bookingIds, input) => {
      const first = new Date(input.startsAt)
      const end = endOf(first, input.minutes)
      onBooked({
        bookingIds,
        firstDate: mytDateKey(first),
        notice: bookedNotice(first, end, input.repeatWeeks, group?.display_names ?? ''),
      })
    },
  })
  const creditRefused = book.isError && toAppError(book.error).code === 'credit_exceeded'

  const update = (patch: Partial<BookingDraft>) => {
    form.setDraft((current) => ({ ...current, ...patch }))
    // A refusal ("Book anyway" included) was about the old input.
    if (book.isError) book.reset()
  }

  const submit = () => {
    if (form.input === null || book.isPending) return
    book.mutate({ ...form.input, ignoreCredit: creditRefused })
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      busy={book.isPending}
      initialFocus={searchRef}
      title="Add booking"
      description={NO_EMAIL}
      actions={
        <BookingActions
          formId={formId}
          label={primaryLabel({
            blocker,
            pending: book.isPending,
            creditRefused,
            start,
            weeks,
            names: group?.display_names ?? '',
          })}
          blocked={blocker !== null}
          pending={book.isPending}
          onCancel={onClose}
        />
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-4.5"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <GroupChooser
          query={query}
          onQuery={setQuery}
          value={draft.groupId}
          onChange={(groupId) => update({ groupId })}
          searchRef={searchRef}
          readOnly={book.isPending}
        />
        <WhenFields draft={draft} readOnly={book.isPending} onChange={update} />
        <LengthChoice
          settings={form.settings}
          value={minutes}
          onChange={(chosen) => update({ minutes: chosen })}
        />
        <BookingRules
          draft={draft}
          gapMinutes={gapMinutes}
          readOnly={book.isPending}
          onChange={update}
        />
        <CheckLine
          checking={form.check.isChecking}
          answer={form.answer}
          error={form.check.isError && !form.check.isChecking ? form.check.error : null}
          repeating={draft.repeat}
          past={form.past}
          gapMinutes={gapMinutes}
          refused={book.isError}
        />
        {group && start && minutes !== null && weeks !== null && (
          <BookingSummary
            group={group}
            start={start}
            end={endOf(start, minutes)}
            weeks={weeks}
            lastStart={lastStartOf(draft, weeks)}
          />
        )}
        {book.isError && (
          // A new attempt's refusal scrolls into view again.
          <BookingError key={book.submittedAt} error={book.error} gapMinutes={gapMinutes} />
        )}
      </form>
    </Dialog>
  )
}
