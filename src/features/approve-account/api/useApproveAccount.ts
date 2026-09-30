import { useMutation, useQueryClient } from '@tanstack/react-query'

import { accountKeys } from '@/entities/account'
import { rpc, toAppError } from '@/shared/api/rpc'

export type ApproveAccountInput = { accountId: string }

type UseApproveAccountOptions = {
  /** Called as soon as the account is approved, before the refresh (the row then leaves
   *  the waiting list). */
  onApproved?: (input: ApproveAccountInput) => void
}

/**
 * `approve_account` (TECH_SPEC §5.3; the coach only): the account can book from now on
 * (BR-2). Approving one already approved does nothing and succeeds. Then it refreshes the
 * accounts (data-contracts §8), also after a refusal (`not_found`: the sign-up is gone),
 * but not after a network failure.
 */
export function useApproveAccount({ onApproved }: UseApproveAccountOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId }: ApproveAccountInput) =>
      rpc('approve_account', { p_account_id: accountId }),
    onSuccess: (_nothing, input) => onApproved?.(input),
    onSettled: (_nothing, error) =>
      error && toAppError(error).code === 'network'
        ? undefined
        : queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  })
}
