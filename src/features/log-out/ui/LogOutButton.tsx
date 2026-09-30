import { useLogOut } from '../api/useLogOut'

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
  return (
    <button type="button" className={className} onClick={logOut}>
      Log out
    </button>
  )
}
