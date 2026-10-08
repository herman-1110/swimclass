import type { Payment } from '@/entities/payment'
import type { Instant } from '@/shared/lib/time'
import { Button } from '@/shared/ui/Button'

import { removePaymentName } from '../model/copy'

type RemovePaymentButtonProps = {
  payment: Payment
  /** useNow(): a date in another year shows the year. */
  now?: Instant
  /** Open RemovePaymentConfirm for this payment (outside the list: the row goes once removed). */
  onClick: () => void
}

/**
 * "Remove" on a payment in History (Herman, 9 Oct 2026; styled like a pinned message's
 * Remove), named for the payment: "Remove the RM 240 payment of 22 Aug".
 */
export function RemovePaymentButton({ payment, now, onClick }: RemovePaymentButtonProps) {
  return (
    <Button
      variant="link"
      textSize="label"
      aria-haspopup="dialog"
      className="-mt-3 shrink-0"
      onClick={onClick}
    >
      {/* The space stays outside the hidden part, so every browser keeps it. */}
      <span>
        Remove <span className="sr-only">{removePaymentName(payment, now)}</span>
      </span>
    </Button>
  )
}
