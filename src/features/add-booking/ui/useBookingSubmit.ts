import type { RefObject } from 'react'

import { toAppError } from '@/shared/api/rpc'
import { type DateKey, mytDateKey } from '@/shared/lib/time'

import { useCoachBook } from '../api/useCoachBook'
import { bookedNotice } from '../model/copy'
import { type BookingDraft, changesDraft, endOf, sameBooking } from '../model/draft'
import type { BookingDraftState } from './useBookingDraft'

/** What the page hears once the lessons are booked. */
export type AddBookingBooked = {
  /** The new bookings, in start order. */
  bookingIds: string[]
  /** The first lesson's day: the page shows its week. */
  firstDate: DateKey
  /** "Booked Tue 29 Sep, 7:30–8:30 pm for Aiman & Sofia." */
  notice: string
}

type BookingSubmitOptions = {
  onBooked: (booked: AddBookingBooked) => void
  /** The primary button: it takes focus from a control that is disabled while booking. */
  primaryRef: RefObject<HTMLButtonElement | null>
}

/** Enter on a radio or checkbox submits the form too, and those are disabled while it books. */
function togglesFocused(): boolean {
  const active = document.activeElement
  return (
    active instanceof HTMLInputElement && (active.type === 'radio' || active.type === 'checkbox')
  )
}

/**
 * Booking from the Add booking form: `coach_book` with the form's input, and "Book anyway"
 * (past the group's credit) only ever for what it refused. While it books the form holds
 * still (changes are ignored), so the notice names what was sent and a refusal is about the
 * form as it stands; a real change clears the refusal, leaving a field as it was doesn't.
 */
export function useBookingSubmit(
  form: BookingDraftState,
  { onBooked, primaryRef }: BookingSubmitOptions,
) {
  const book = useCoachBook({
    onBooked: (bookingIds, input) => {
      const first = new Date(input.startsAt)
      const end = endOf(first, input.minutes)
      onBooked({
        bookingIds,
        firstDate: mytDateKey(first),
        notice: bookedNotice(first, end, input.repeatWeeks, form.namesOf(input.groupId)),
      })
    },
  })
  const creditRefused =
    book.isError &&
    toAppError(book.error).code === 'credit_exceeded' &&
    sameBooking(book.variables, form.input)

  const update = (patch: Partial<BookingDraft>) => {
    if (book.isPending || !changesDraft(form.draft, patch)) return
    form.setDraft((current) => ({ ...current, ...patch }))
    // A refusal ("Book anyway" included) was about the old input.
    if (book.isError) book.reset()
  }

  const submit = () => {
    if (form.input === null || book.isPending) return
    // Focus would fall to the page with the disabled control: "Booking…" takes it.
    if (togglesFocused()) primaryRef.current?.focus()
    book.mutate({ ...form.input, ignoreCredit: creditRefused })
  }

  return { book, creditRefused, update, submit }
}
