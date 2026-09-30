import { useMutation } from '@tanstack/react-query'

import { logOut } from '@/shared/api/auth'

/**
 * Ends the session (auth spec W7). SessionProvider clears the cached data as it ends, so
 * whoever signs in next never sees this account's data, and Log in's guard then shows the
 * form (without `from`).
 */
export function useEndSession() {
  return useMutation({ mutationFn: logOut })
}
