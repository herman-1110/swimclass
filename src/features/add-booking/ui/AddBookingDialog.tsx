import type { DateKey } from '@/shared/lib/time'

import { type AddBookingBooked, BookingForm } from './BookingForm'

type AddBookingDialogProps = {
  /** Shown. The owner keeps it in state; "Cancel", "Close" and Esc call onClose. */
  open: boolean
  onClose: () => void
  /** The day it opens on: the page's ?day, or today (the Schedule spec §6.4). */
  defaultDate: DateKey
  /**
   * Booked: close the dialog here, show the notice ("Booked Tue 29 Sep, 7:30–8:30 pm for
   * Aiman & Sofia.") and show the first lesson's week.
   */
  onBooked: (booked: AddBookingBooked) => void
}

/**
 * Add booking (DESIGN §4 "not drawn"; prompt 08 TASK 5): the coach books any active group at
 * any time, past dates and dates beyond the booking window included, optionally outside open
 * hours or without the travel gap, weekly for 2 to 52 weeks. No email goes to the customer.
 * Each opening starts fresh.
 */
export function AddBookingDialog({ open, ...rest }: AddBookingDialogProps) {
  return open ? <BookingForm {...rest} /> : null
}
