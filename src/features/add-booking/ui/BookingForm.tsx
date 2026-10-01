import { useId, useRef, useState } from 'react'

import type { DateKey } from '@/shared/lib/time'
import { Dialog } from '@/shared/ui/Dialog'

import { NO_EMAIL, primaryLabel } from '../model/copy'
import { endOf, lastStartOf } from '../model/draft'
import { BookingActions } from './BookingActions'
import { BookingError } from './BookingError'
import { BookingRules } from './BookingRules'
import { BookingSummary } from './BookingSummary'
import { CheckLine } from './CheckLine'
import { GroupChooser } from './GroupChooser'
import { LengthChoice } from './LengthChoice'
import { useBookingDraft } from './useBookingDraft'
import { type AddBookingBooked, useBookingSubmit } from './useBookingSubmit'
import { WhenFields } from './WhenFields'

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
 * anyway" after `credit_exceeded`). While it books the form holds still.
 */
export function BookingForm({ onClose, defaultDate, onBooked }: BookingFormProps) {
  const formId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const [query, setQuery] = useState('')
  const form = useBookingDraft(defaultDate)
  const { draft, group, start, minutes, weeks, blocker, gapMinutes } = form
  const { book, creditRefused, update, submit } = useBookingSubmit(form, { onBooked, primaryRef })

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
          primaryRef={primaryRef}
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
          disabled={book.isPending}
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
