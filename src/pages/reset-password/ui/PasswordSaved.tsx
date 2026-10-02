import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { PageHeader } from '@/shared/ui/PageHeader'

type PasswordSavedProps = {
  /** Who is signed in, once their profile has loaded. */
  username?: string
}

const TITLE = 'New password saved'

/**
 * Set a new password's result (auth spec §2.5): the reset link signed the person in, so they
 * go on from here. Focus moves to the heading, since it replaces the form.
 */
export function PasswordSaved({ username }: PasswordSavedProps) {
  return (
    <>
      <title>{`${TITLE} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader
        size="auth"
        title={TITLE}
        // "Signed in", as the sidebar and Waiting for approval name the state ("Log in" is the action).
        description={username ? `You’re signed in as ${username}.` : undefined}
        focusOnMount
      />
      <ButtonLink to={ROUTES.home} size="xl" block>
        Continue
      </ButtonLink>
    </>
  )
}
