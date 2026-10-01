import { useMutation, useQueryClient } from '@tanstack/react-query'

import { type FunctionArgs, rpc } from '@/shared/api/rpc'

import type { RecordPaymentInput } from '../model/paymentForm'
import { refreshAfterPayment } from './refreshAfterPayment'

/**
 * record_payment's arguments as the function takes them. The generated type says the amount
 * is always a number, but null is how the coach asks for the type's price (TECH_SPEC §5.2;
 * coach-students C19), so it is widened here.
 */
type RecordPaymentArgs = Omit<FunctionArgs<'record_payment'>, 'p_amount_cents'> & {
  p_amount_cents: number | null
}

type UseRecordPaymentOptions = {
  /** Called as soon as the payment is saved, before the refresh. */
  onSaved?: (input: RecordPaymentInput) => void
}

/**
 * `record_payment` (TECH_SPEC §5.2; the coach only): a payment of some lessons for a group.
 * With no amount the database prices it from the type's price, or answers `price_not_set`.
 * Then it refreshes what a payment changes, and stays pending until the fresh data is in.
 */
export function useRecordPayment({ onSaved }: UseRecordPaymentOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, lessons, amountCents, method, paidOn, note }: RecordPaymentInput) => {
      const args: RecordPaymentArgs = {
        p_group_id: groupId,
        p_lessons: lessons,
        p_amount_cents: amountCents,
        p_method: method,
        p_paid_on: paidOn,
        p_note: note,
      }
      return rpc('record_payment', args as FunctionArgs<'record_payment'>)
    },
    onSuccess: (_paymentId, input) => {
      onSaved?.(input)
      return refreshAfterPayment(queryClient)
    },
  })
}
