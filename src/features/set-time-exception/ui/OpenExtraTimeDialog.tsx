import type { DateKey } from '@/shared/lib/time'

import { TimeExceptionForm, type TimeExceptionSaved } from './TimeExceptionForm'

type OpenExtraTimeDialogProps = {
  /** Shown. The owner keeps it in state; "Cancel", "Close" and Esc call onClose. */
  open: boolean
  onClose: () => void
  /** The day it opens on (the page's ?day, or today). */
  defaultDate: DateKey
  /** The time is open: close the dialog here, show the notice ("Extra time opened.") and
   *  show that day's week. */
  onSaved: (saved: TimeExceptionSaved) => void
}

/**
 * Open extra time (DESIGN §4 "not drawn"; prompt 08 TASK 5; the Schedule spec §6.5, §7.4):
 * one day's extra hours that customers can book (TECH_SPEC §10), with an optional private
 * note, and a warning when part of it is blocked (blocked time wins) or a note when it is
 * open already. The weekly hours stay as they are.
 */
export function OpenExtraTimeDialog({ open, ...rest }: OpenExtraTimeDialogProps) {
  return open ? <TimeExceptionForm kind="open" {...rest} /> : null
}
