import { useMutation, useQueryClient } from '@tanstack/react-query'

import { accountKeys } from '@/entities/account'
import { callEdge, toAppError } from '@/shared/api/rpc'

export type RemoveSignUpInput = { accountId: string }

type UseRemoveSignUpOptions = {
  /** Called as soon as the account is deleted, before the refresh. */
  onRemoved?: (input: RemoveSignUpInput) => void
}

/**
 * `admin-accounts` `delete_account` (TECH_SPEC §7): deletes a sign-up the coach doesn't want,
 * only a customer still waiting for approval with no groups (`account_approved`,
 * `has_groups`, `not_found`: DESIGN §6's coach words). Then it refreshes the accounts.
 */
export function useRemoveSignUp({ onRemoved }: UseRemoveSignUpOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId }: RemoveSignUpInput) =>
      callEdge<unknown>('admin-accounts', { action: 'delete_account', account_id: accountId }),
    onSuccess: (_answer, input) => onRemoved?.(input),
    onSettled: (_answer, error) =>
      error && toAppError(error).code === 'network'
        ? undefined
        : queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  })
}
