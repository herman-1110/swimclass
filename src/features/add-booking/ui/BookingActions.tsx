import type { Ref } from 'react'

import { Button } from '@/shared/ui/Button'

type BookingActionsProps = {
  /** The form the primary button submits. */
  formId: string
  /** The primary button: focus goes there when what had it is disabled while booking. */
  primaryRef?: Ref<HTMLButtonElement>
  /** "Book 7:30 pm for Aiman & Sofia", "Pick a free time", "Book anyway", "Booking…". */
  label: string
  /** Something keeps it from booking; the label says what. */
  blocked: boolean
  /** `coach_book` is running. */
  pending: boolean
  onCancel: () => void
}

/**
 * Add booking's buttons (the Schedule spec §3.10, §7.4): the primary, which submits the form
 * and says what it books or what is still missing, and a quiet "Cancel". Both keep focus
 * while they can't be used.
 */
export function BookingActions({
  formId,
  primaryRef,
  label,
  blocked,
  pending,
  onCancel,
}: BookingActionsProps) {
  return (
    <>
      <Button
        ref={primaryRef}
        type="submit"
        form={formId}
        className="flex-1"
        pending={pending}
        aria-disabled={blocked || pending || undefined}
      >
        {label}
      </Button>
      <Button variant="quiet" tone="muted" aria-disabled={pending || undefined} onClick={onCancel}>
        Cancel
      </Button>
    </>
  )
}
