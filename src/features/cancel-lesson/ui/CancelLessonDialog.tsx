import type { CancelableLesson, CancelAudience } from '../model/types'
import { CancelLessonConfirm } from './CancelLessonConfirm'

type CancelLessonDialogProps = {
  /** Shown. The owner keeps it in state; "Keep lesson", "Close" and Esc call onClose. */
  open: boolean
  onClose: () => void
  lesson: CancelableLesson
  /**
   * customer (My classes): "The lesson goes back to your package.", DESIGN §6's customer
   * words. coach (the lesson details): the customer is emailed, an optional reason (up to
   * 500 characters) goes into that email, and the coach's words come first.
   */
  audience: CancelAudience
  /** `cancel_cutoff_hours` (settings), for the customer's `locked` message. Without it that
   *  message is the generic one. */
  cutoffHours?: number | null
  /**
   * The database has cancelled the lesson: close the dialog here, and show the notice as a
   * status message ("Lesson cancelled: Sat 3 Oct, 9:00–10:00 am for Aiman & Sofia. It went
   * back to your package." / "Lesson cancelled. Mei Ling will get an email."). The lists
   * refresh right after.
   */
  onCancelled: (notice: string) => void
}

/**
 * The cancel confirmation for both sides (DESIGN §4; ARCHITECTURE §3.2: "both: confirm
 * dialog → cancel_booking"): the kit's Dialog as an alertdialog, focus on "Keep lesson",
 * "Cancel lesson" → "Cancelling…" while the call runs, the refusal's message above the
 * buttons, and the refresh of every lesson list after.
 */
export function CancelLessonDialog({ open, ...rest }: CancelLessonDialogProps) {
  return open ? <CancelLessonConfirm {...rest} /> : null
}
