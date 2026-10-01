import type { DateKey } from '@/shared/lib/time'

import { TimeExceptionForm, type TimeExceptionSaved } from './TimeExceptionForm'

type BlockTimeDialogProps = {
  /** Shown. The owner keeps it in state; "Cancel", "Close" and Esc call onClose. */
  open: boolean
  onClose: () => void
  /** The day it opens on (the page's ?day, or today). */
  defaultDate: DateKey
  /**
   * Every day is blocked: close the dialog here, show the notice ("Time blocked.", "Time
   * blocked on 3 days.") and show the first day's week.
   */
  onSaved: (saved: TimeExceptionSaved) => void
}

/**
 * Block time (DESIGN §4 "not drawn"; prompt 08 TASK 5; the Schedule spec §6.5, §7.4): a day
 * or a run of days, the same hours each day (starting on that day's open hours), an optional
 * private note, and the lessons it would leave booked. One `add_exception` per day; customers
 * can't book the time, and the weekly hours stay as they are.
 */
export function BlockTimeDialog({ open, ...rest }: BlockTimeDialogProps) {
  return open ? <TimeExceptionForm kind="closed" {...rest} /> : null
}
