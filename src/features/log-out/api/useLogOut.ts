import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { logOut } from '@/shared/api/auth'
import { ROUTES } from '@/shared/config/routes'

/**
 * Logs out, then opens Log in (auth spec §4.3). SessionProvider clears the cached data as
 * the session ends, so whoever signs in next never sees this account's data.
 */
export function useLogOut() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: logOut,
    onSuccess: () => navigate(ROUTES.login, { replace: true }),
  })
}
