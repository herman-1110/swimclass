import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

const TITLE = 'This link has expired'

/**
 * Set a new password with no session to set it for (auth spec §2.5): the link expired or was
 * used, or the page was opened directly while signed out.
 */
export function LinkExpired() {
  return (
    <>
      <title>{`${TITLE} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader
        size="auth"
        title={TITLE}
        description="Reset links work once and stop working after a while. Ask for a new one."
      />
      <ButtonLink to={ROUTES.forgotPassword} size="xl" block>
        Ask for a new link
      </ButtonLink>
      <CardFooter>
        <ButtonLink to={ROUTES.login} variant="link">
          Back to log in
        </ButtonLink>
      </CardFooter>
    </>
  )
}
