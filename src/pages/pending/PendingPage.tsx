import { useMyProfile } from '@/entities/account'
import { DocumentTitle } from '@/entities/settings'
import { LogOutButton } from '@/features/log-out'
import { useWords } from '@/shared/i18n/context'
import { buttonClasses } from '@/shared/ui/buttonClasses'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

import { pendingPageWords } from './model/words'

// Asks again every minute (and when the tab comes back), so an approval shows without a
// reload: RequirePending then sends the account home (auth spec R2, §6.5, Q12).
const POLL_MS = 60_000

/**
 * Waiting for approval (auth spec §2.6): a new account that the coach hasn't approved yet
 * sees only this page. PendingLayout shows the settings' business name above it.
 */
export function PendingPage() {
  const profile = useMyProfile({ refetchInterval: POLL_MS })
  const w = useWords(pendingPageWords)

  return (
    <>
      <DocumentTitle page={w.title} />
      <PageHeader size="auth" title={w.title} description={w.description} />
      <CardFooter>
        <LogOutButton className={buttonClasses({ variant: 'link' })} />
        {profile.data && (
          <p className="text-small leading-normal text-muted wrap-anywhere">
            {w.signedInAs(profile.data.display_name, profile.data.username)}
          </p>
        )}
      </CardFooter>
    </>
  )
}
