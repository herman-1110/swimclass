import { useMyProfile } from '@/entities/account'
import { DocumentTitle } from '@/entities/settings'
import { LogOutButton } from '@/features/log-out'
import { buttonClasses } from '@/shared/ui/buttonClasses'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

const TITLE = 'Waiting for approval'

// Asks again every minute (and when the tab comes back), so an approval shows without a
// reload: RequirePending then sends the account home (auth spec R2, §6.5, Q12).
const POLL_MS = 60_000

/**
 * Waiting for approval (auth spec §2.6): a new account that the coach hasn't approved yet
 * sees only this page. PendingLayout shows the settings' business name above it.
 */
export function PendingPage() {
  const profile = useMyProfile({ refetchInterval: POLL_MS })

  return (
    <>
      <DocumentTitle page={TITLE} />
      <PageHeader
        size="auth"
        title={TITLE}
        description="Your coach needs to approve your account before you can book. You can book as soon as that’s done."
      />
      <CardFooter>
        <LogOutButton className={buttonClasses({ variant: 'link' })} />
        {profile.data && (
          <p className="text-small leading-normal text-muted wrap-anywhere">
            Signed in as {profile.data.display_name} ({profile.data.username}).
          </p>
        )}
      </CardFooter>
    </>
  )
}
