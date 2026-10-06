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
import { HomeScreenHint } from './ui/HomeScreenHint'

const TITLE = 'Account'

/**
 * Account (auth spec §2.7; not drawn, so in the customer pages' style): the details only the
 * coach can change, name and phone, a new password, how to add the site to the home screen,
 * and Log out. The coach reaches it through View as customer and also gets "Back to coach
 * view" here.
 */
export function AccountPage() {
  const session = useSession()
  const profile = useMyProfile()
  const email = session.status === 'signed-in' ? session.session.email : null

  return (
    // A 420 px column, like the sign-in card (auth spec §2.7, Q15). From 1280 px the page
    // takes the other customer pages' 1100 px, in the middle beside the sidebar, with two
    // columns: your details on the left, the password and home screen on the right (Herman,
    // 6 Oct 2026: the lone column left the rest of a laptop screen blank).
    <div className="flex w-full max-w-[420px] flex-col gap-8 xl:mx-auto xl:max-w-[1100px]">
      <DocumentTitle page={TITLE} />
      <PageHeader size="customer" title={TITLE} />
      {profile.data ? (
        <div className="flex flex-col gap-8 xl:grid xl:grid-cols-2 xl:items-start xl:gap-x-16">
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
          <div className="flex flex-col gap-8">
            <section
              aria-labelledby="account-password-heading"
              className="flex flex-col gap-4 border-t border-line pt-6 xl:border-t-0 xl:pt-0"
            >
              <SectionLabel as="h2" id="account-password-heading">
                Password
              </SectionLabel>
              <ChangePasswordForm labelledBy="account-password-heading" />
            </section>
            <HomeScreenHint />
          </div>
          <div className="flex flex-col items-start border-t border-line pt-6 xl:col-span-2">
            {profile.data.role === 'coach' && (
              <ButtonLink to={ROUTES.coachSchedule} variant="link" flush>
                Back to coach view
              </ButtonLink>
            )}
            <LogOutButton className={buttonClasses({ variant: 'link', flush: true })} />
          </div>
        </div>
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
        // As wide as the details column it stands in for.
        <div className="xl:grid xl:grid-cols-2 xl:gap-x-16">
          <AccountSkeleton />
        </div>
      )}
    </div>
  )
}
