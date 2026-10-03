import { useMyProfile, useSession } from '@/entities/account'
import { DocumentTitle } from '@/entities/settings'
import { ChangePasswordForm } from '@/features/change-password'
import { LogOutButton } from '@/features/log-out'
import { ProfileForm } from '@/features/update-profile'
import { messageFor } from '@/shared/config/messages'
import { ROUTES } from '@/shared/config/routes'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'
import { buttonClasses } from '@/shared/ui/buttonClasses'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SectionLabel } from '@/shared/ui/SectionLabel'

import { AccountSkeleton } from './ui/AccountSkeleton'
import { AccountSummary } from './ui/AccountSummary'

const TITLE = 'Account'

/**
 * Account (auth spec §2.7; not drawn, so in the customer pages' style): the details only the
 * coach can change, name and phone, a new password, and Log out. The coach reaches it
 * through View as customer and also gets "Back to coach view" here.
 */
export function AccountPage() {
  const session = useSession()
  const profile = useMyProfile()
  const email = session.status === 'signed-in' ? session.session.email : null

  return (
    // A 420 px column, like the sign-in card (auth spec §2.7, Q15).
    <div className="flex w-full max-w-[420px] flex-col gap-8">
      <DocumentTitle page={TITLE} />
      <PageHeader size="customer" title={TITLE} />
      {profile.data ? (
        <>
          <section aria-labelledby="account-details-heading" className="flex flex-col gap-4">
            <SectionLabel as="h2" id="account-details-heading">
              Your details
            </SectionLabel>
            <AccountSummary
              username={profile.data.username}
              email={email}
              isCoach={profile.data.role === 'coach'}
            />
            <ProfileForm
              key={profile.data.id}
              profile={profile.data}
              labelledBy="account-details-heading"
            />
          </section>
          <section
            aria-labelledby="account-password-heading"
            className="flex flex-col gap-4 border-t border-line pt-6"
          >
            <SectionLabel as="h2" id="account-password-heading">
              Password
            </SectionLabel>
            <ChangePasswordForm labelledBy="account-password-heading" />
          </section>
          <div className="flex flex-col items-start border-t border-line pt-6">
            {profile.data.role === 'coach' && (
              <ButtonLink to={ROUTES.coachSchedule} variant="link" flush>
                Back to coach view
              </ButtonLink>
            )}
            <LogOutButton className={buttonClasses({ variant: 'link', flush: true })} />
          </div>
        </>
      ) : profile.isError ? (
        <Banner
          role="alert"
          tone="warn"
          action={
            <Button variant="link" onClick={() => void profile.refetch()}>
              Try again
            </Button>
          }
        >
          {messageFor(profile.error)}
        </Banner>
      ) : (
        <AccountSkeleton />
      )}
    </div>
  )
}
