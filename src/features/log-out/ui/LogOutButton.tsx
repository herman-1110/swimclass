import { useLogOut } from '../api/useLogOut'

type LogOutButtonProps = {
  /**
   * The button's whole look. It has none of its own, so the same button fits the coach's
   * sidebar, Account and Waiting for approval.
   */
  className?: string
}

/** "Log out", then Log in. While it works it says "Logging out…" and ignores more clicks. */
export function LogOutButton({ className }: LogOutButtonProps) {
  const logOut = useLogOut()
  return (
    <button
      type="button"
      className={className}
      // aria-disabled, not disabled, so focus stays on the button (auth spec §7.5).
      aria-disabled={logOut.isPending || undefined}
      onClick={() => {
        if (!logOut.isPending) logOut.mutate()
      }}
    >
      {logOut.isPending ? 'Logging out…' : 'Log out'}
    </button>
  )
}
