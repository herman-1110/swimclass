import { useMutation } from '@tanstack/react-query'

import { updatePassword } from '@/shared/api/auth'

/**
 * Set a new password (auth spec W4), for the account the reset or invite link signed in.
 * Refusals: `weak_password`, `same_password`, `not_signed_in` (demo mode; Supabase gives
 * `unknown` without a session), `network`. Nothing to refresh.
 */
export function useSetNewPassword() {
  return useMutation({ mutationFn: (password: string) => updatePassword(password) })
}
