import { useWords } from '@/shared/i18n/context'

import { useLogOut } from '../api/useLogOut'
import { logOutWords } from '../model/words'

type LogOutButtonProps = {
  /**
   * The button's whole look. It has none of its own, so the same button fits the coach's
   * sidebar, Account and Waiting for approval.
   */
  className?: string
}

/**
 * "Log out": opens Log in, which says "Logging out…" while the session ends. A page's leave
 * guard can stop it first (useLogOut), and then the person stays signed in on the page.
 */
export function LogOutButton({ className }: LogOutButtonProps) {
  const logOut = useLogOut()
  const w = useWords(logOutWords)
  return (
    <button type="button" className={className} onClick={logOut}>
      {w.logOut}
    </button>
  )
}
