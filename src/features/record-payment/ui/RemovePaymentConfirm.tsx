import { useEffect, useRef } from 'react'

import type { Payment } from '@/entities/payment'
import { toAppError } from '@/shared/api/rpc'
import { messageFor } from '@/shared/config/messages'
import type { Instant } from '@/shared/lib/time'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'

import { useRemovePayment } from '../api/useRemovePayment'
import {
  KEEP_PAYMENT,
  PAYMENT_ALREADY_REMOVED,
  PAYMENT_REMOVED,
  REMOVE_PAYMENT,
  REMOVE_PAYMENT_TITLE,
  removePaymentDescription,
} from '../model/copy'

type RemovePaymentConfirmProps = {
  payment: Payment
  /** The group's names: "Aiman & Sofia". */
  names: string
  /** useNow(): a date in another year shows the year. */
  now?: Instant
  /** "Keep payment" and Esc. */
  onClose: () => void
  /** Gone: close this and show the notice ("Payment removed."). */
  onRemoved: (notice: string) => void
}

/**
 * "Remove this payment?" (Herman, 9 Oct 2026; like Remove message's confirmation): an
 * alertdialog saying what the payment was and what removing it changes, with focus on the
 * safe "Keep payment". "Remove payment" → "Removing…" while the call runs. Only a network
 * failure is worth trying again; after any other refusal "Keep payment" reads "Close".
 * Mounted only while open, so each opening starts fresh. Render it outside the list: the row
 * goes once the payments refresh.
 */
export function RemovePaymentConfirm({
  payment,
  names,
  now,
  onClose,
  onRemoved,
}: RemovePaymentConfirmProps) {
  const keep = useRef<HTMLButtonElement>(null)
  const remove = useRemovePayment({
    onRemoved: (result) =>
      onRemoved(result === 'removed' ? PAYMENT_REMOVED : PAYMENT_ALREADY_REMOVED),
  })
  const final = remove.isError && toAppError(remove.error).code !== 'network'

  // The focused "Remove payment" goes after a final refusal: keep focus in the dialog.
  useEffect(() => {
    if (final) keep.current?.focus()
  }, [final])

  return (
    <Dialog
      open
      onClose={onClose}
      role="alertdialog"
      size="sm"
      hideClose
      busy={remove.isPending}
      initialFocus={keep}
      title={REMOVE_PAYMENT_TITLE}
      description={removePaymentDescription(payment, names, now)}
      actions={
        <>
          {!final && (
            <Button
              className="flex-1"
              pending={remove.isPending}
              aria-disabled={remove.isPending || undefined}
              onClick={() => remove.mutate({ paymentId: payment.id })}
            >
              {remove.isPending ? 'Removing…' : REMOVE_PAYMENT}
            </Button>
          )}
          <Button
            ref={keep}
            variant="quiet"
            tone="muted"
            aria-disabled={remove.isPending || undefined}
            onClick={onClose}
          >
            {final ? 'Close' : KEEP_PAYMENT}
          </Button>
        </>
      }
    >
      {remove.isError && (
        <p role="alert" className="text-label leading-normal text-warn">
          {messageFor(remove.error, { audience: 'coach' })}
        </p>
      )}
    </Dialog>
  )
}
