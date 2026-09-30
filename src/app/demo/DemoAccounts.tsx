import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { useMyProfile } from '@/entities/account'
import { logIn } from '@/shared/api/auth'
import { type DemoAccount, demoAccounts } from '@/shared/api/backend'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'

import { demoKeys } from './demoKeys'

type DemoAccountsProps = {
  /** After signing in, before going home: the panel closes. */
  onSignedIn: () => void
}

/** "herman · coach", "newbie · waiting", "meiling · signed in". */
function accountNote(account: DemoAccount, signedIn: boolean): string {
  return [
    account.username,
    account.role === 'coach' && 'coach',
    !account.approved && 'waiting',
    signedIn && 'signed in',
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Every account in the demo database (the coach first), each a button that signs in as it. */
export function DemoAccounts({ onSignedIn }: DemoAccountsProps) {
  const navigate = useNavigate()
  const me = useMyProfile()
  // Read again each time the panel opens, so new sign-ups are there.
  const accounts = useQuery({
    queryKey: demoKeys.accounts(),
    queryFn: demoAccounts,
    refetchOnMount: 'always',
  })
  const signIn = useMutation({
    mutationFn: (username: string) => logIn(username, DEMO_PASSWORD),
    onSuccess: () => {
      onSignedIn()
      return navigate(ROUTES.home)
    },
  })

  return (
    <section aria-labelledby="demo-accounts-title" className="flex flex-col gap-3">
      <h3 id="demo-accounts-title" className="text-label font-medium text-muted">
        Sign in as
      </h3>
      {accounts.isPending && (
        <p role="status" className="text-sm text-muted">
          Loading…
        </p>
      )}
      {accounts.isError && (
        <p role="alert" className="text-sm text-warn">
          Couldn’t read the demo accounts. Reload the page and try again.
        </p>
      )}
      {accounts.data && (
        <ul role="list" className="grid grid-cols-2 gap-2">
          {accounts.data.map((account) => {
            const signedIn = account.username === me.data?.username
            return (
              <li key={account.username} className="flex">
                <button
                  type="button"
                  aria-disabled={signIn.isPending || undefined}
                  onClick={() => {
                    if (!signIn.isPending) signIn.mutate(account.username)
                  }}
                  className={cn(
                    'flex min-h-11 w-full flex-col items-start justify-center gap-0.5 rounded-control border px-3 py-2 text-left hover:bg-subtle',
                    signedIn ? 'border-accent bg-accent-soft' : 'border-field bg-white',
                  )}
                >
                  <span className="text-sm leading-[normal] font-medium text-ink">
                    {account.displayName}
                  </span>{' '}
                  <span className="text-small text-muted">{accountNote(account, signedIn)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {signIn.isPending && (
        <p role="status" className="text-label text-muted">
          Signing in as {signIn.variables}…
        </p>
      )}
      {signIn.isError && (
        <p role="alert" className="text-label leading-normal text-warn">
          Couldn’t sign in as {signIn.variables}. If its password was changed, reset the demo data
          to put it back.
        </p>
      )}
    </section>
  )
}
