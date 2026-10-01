import { useMutation } from '@tanstack/react-query'

import { updatePassword } from '@/shared/api/auth'

/**
 * Change the signed-in account's password from Account (auth spec W5; the same call as a
 * reset's last step). Refusals: `weak_password`, `same_password`, `not_signed_in`, `network`.
 * Nothing to refresh: no screen shows the password.
 */
export function useChangePassword() {
  return useMutation({ mutationFn: (password: string) => updatePassword(password) })
}
