import { useMutation, useQueryClient } from '@tanstack/react-query'

import { rpc, toAppError } from '@/shared/api/rpc'

import { refreshAfterPayment } from './refreshAfterPayment'

export type RemovePaymentInput = { paymentId: string }

/** removed, or already gone (`not_found`: another tab removed it): the end is the same. */
export type RemovePaymentResult = 'removed' | 'already-removed'

type UseRemovePaymentOptions = {
  /** Called as soon as the payment is gone, before the refresh: close the confirmation. */
  onRemoved?: (result: RemovePaymentResult, input: RemovePaymentInput) => void
}

/**
 * `remove_payment` (TECH_SPEC §5.2; the coach only; Herman, 9 Oct 2026): deletes a payment
 * or free lesson saved by mistake. Then it refreshes what a payment changes, and stays
 * pending until the fresh data is in. Refusals: `online_payment`, `not_coach`.
 */
export function useRemovePayment({ onRemoved }: UseRemovePaymentOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ paymentId }: RemovePaymentInput): Promise<RemovePaymentResult> => {
      try {
        await rpc('remove_payment', { p_payment_id: paymentId })
        return 'removed'
      } catch (error) {
        if (toAppError(error).code === 'not_found') return 'already-removed'
        throw error
      }
    },
    onSuccess: (result, input) => {
      onRemoved?.(result, input)
      return refreshAfterPayment(queryClient)
    },
  })
}
