import { useMutation, useQueryClient } from '@tanstack/react-query'

import { usernameAvailableQuery } from '@/entities/account'
import { signUp, type SignUpInput } from '@/shared/api/auth'
import { AppError, toAppError } from '@/shared/api/rpc'

/**
 * Sign up (auth spec W2): makes an account that waits for the coach's approval. Pass
 * signUpInput's values (the username normalized and valid).
 *
 * First the username must be free: the form's live check may still be running or may have
 * failed, so this asks (or reuses a fresh answer). Supabase reports a failed profile trigger
 * only as `signup_failed`; most likely someone took the username meanwhile, so it asks
 * again, fresh. Either way a taken name fails as `username_taken`, and the answer lands in
 * the live check's cache, so the field says so too. Other refusals: `weak_password`,
 * `email_address_invalid`, `user_already_exists` (demo mode; Supabase answers success),
 * `over_email_send_rate_limit`, `network`.
 *
 * Resolves `{ confirmEmail }`: true when a confirmation email went out (always in demo mode,
 * which signs nobody in). Nothing to refresh: a new account has no data on screen yet.
 */
export function useSignUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SignUpInput) => {
      if (!(await queryClient.fetchQuery(usernameAvailableQuery(input.username)))) {
        throw new AppError('username_taken')
      }
      try {
        return await signUp(input)
      } catch (error) {
        const refusal = toAppError(error)
        if (refusal.code !== 'signup_failed') throw refusal
        const free = await queryClient.fetchQuery({
          ...usernameAvailableQuery(input.username),
          staleTime: 0,
        })
        throw free ? refusal : new AppError('username_taken', {}, error)
      }
    },
  })
}
