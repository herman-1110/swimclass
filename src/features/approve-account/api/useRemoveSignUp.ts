import { useMutation, useQueryClient } from '@tanstack/react-query'

import { accountKeys } from '@/entities/account'
import { callEdge, toAppError } from '@/shared/api/rpc'

/**
 * Whether the `admin-accounts` Edge Function can delete a sign-up yet. Its `delete_account`
 * action comes with prompt 09 (data-contracts §5.2: only unapproved accounts with no groups)
 * and doesn't exist today (demo mode answers `unknown`), so RemoveSignUpButton renders
 * nothing until this is turned on (the Students spec §6: "Remove" is hidden until then).
 */
export const REMOVE_SIGN_UP_AVAILABLE: boolean = false

export type RemoveSignUpInput = { accountId: string }

type UseRemoveSignUpOptions = {
  /** Called as soon as the account is deleted, before the refresh. */
  onRemoved?: (input: RemoveSignUpInput) => void
}

/**
 * `admin-accounts` `delete_account` (prompt 09, planned): deletes a sign-up the coach doesn't
 * want. Its refusal codes aren't defined yet, so every failure reads as the generic message.
 * Then it refreshes the accounts.
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
