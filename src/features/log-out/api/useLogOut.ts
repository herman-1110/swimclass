import { useNavigate } from 'react-router'

import { ROUTES } from '@/shared/config/routes'

import { LOG_OUT_REQUEST } from '../model/logOutRequest'

/**
 * "Log out" (auth spec §4.3, W7): opens Log in in place of this page, asking it to end the
 * session first (LOG_OUT_REQUEST; RedirectIfSignedIn then shows LoggingOut). Because it is a
 * navigation, a page with unsaved changes can stop it with its leave guard (coach Settings
 * §7.4), and then nothing has happened yet.
 */
export function useLogOut(): () => void {
  const navigate = useNavigate()
  return () => {
    void navigate(ROUTES.login, { replace: true, state: LOG_OUT_REQUEST })
  }
}
