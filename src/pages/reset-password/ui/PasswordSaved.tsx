import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { useWords } from '@/shared/i18n/context'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { PageHeader } from '@/shared/ui/PageHeader'

import { resetPageWords } from '../model/words'

type PasswordSavedProps = {
  /** Who is signed in, once their profile has loaded. */
  username?: string
}

/**
 * Set a new password's result (auth spec §2.5): the reset link signed the person in, so they
 * go on from here. Focus moves to the heading, since it replaces the form.
 */
export function PasswordSaved({ username }: PasswordSavedProps) {
  const w = useWords(resetPageWords)
  return (
    <>
      <title>{`${w.savedTitle} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader
        size="auth"
        title={w.savedTitle}
        // "Signed in", as the sidebar and Waiting for approval name the state ("Log in" is the action).
        description={username ? w.signedInAs(username) : undefined}
        focusOnMount
      />
      <ButtonLink to={ROUTES.home} size="xl" block>
        {w.continue}
      </ButtonLink>
    </>
  )
}
