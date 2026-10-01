import { useMutation, useQueryClient } from '@tanstack/react-query'

import { accountKeys } from '@/entities/account'
import { AppError, callEdge } from '@/shared/api/rpc'

export type CreateAccountInput = {
  /** Normalized ("siti.rahman"): the username the form checked. */
  username: string
  displayName: string
  email: string
  phone: string | null
}

/**
 * `admin-accounts` `create_account` (TECH_SPEC §7; the coach only): a customer account,
 * approved, whose owner gets an email to set a password (BR-3). Resolves to the new
 * account's id once the account list is fresh, so the Account select can show it straight
 * away, even if adding the group fails next (the spec §5.2.2, §5.5).
 *
 * Refusals: `invalid_username`, `username_taken`, `invalid_display_name`, `invalid_phone`,
 * `invalid_email`, `email_taken`, `not_coach`; anything else (including an Edge Function
 * that isn't deployed yet) is `unknown`, which the form shows as the generic message with
 * everything kept. Demo mode answers like the real function, without sending an email.
 */
export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAccountInput): Promise<string> => {
      const answer = await callEdge<unknown>('admin-accounts', {
        action: 'create_account',
        username: input.username,
        display_name: input.displayName,
        email: input.email,
        phone: input.phone,
      })
      // The reply TECH_SPEC §7 leaves open: { account_id } (data-contracts §5.2, de facto).
      const accountId =
        typeof answer === 'object' && answer !== null && 'account_id' in answer
          ? answer.account_id
          : null
      if (typeof accountId !== 'string') throw new AppError('unknown')
      return accountId
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  })
}
