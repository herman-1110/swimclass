import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

type ResetLinkSentProps = {
  /** The address the link was asked for. */
  email: string
}

const TITLE = 'Check your email'

/**
 * Forgot password's result (auth spec §2.4, §6.3): the same words whether or not an account
 * uses the address, so the page never tells who has an account. Focus moves to the heading,
 * since it replaces the form. Demo mode sends no email, and says what to do instead.
 */
export function ResetLinkSent({ email }: ResetLinkSentProps) {
  return (
    <>
      <title>{`${TITLE} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader
        size="auth"
        title={TITLE}
        description={
          <>
            If an account uses <span className="wrap-anywhere">{email}</span>, we’ve sent it a link
            to set a new password.
          </>
        }
        focusOnMount
      />
      {/* The build-time constant: a production build leaves the demo note out. */}
      {import.meta.env.VITE_DEMO === 'true' && (
        <p className="rounded-control bg-subtle px-3.5 py-3 text-label leading-normal text-muted">
          Demo mode sends no email. Log in, then change the password on your Account page.
        </p>
      )}
      <CardFooter>
        <ButtonLink to={ROUTES.login} variant="link">
          Back to log in
        </ButtonLink>
      </CardFooter>
    </>
  )
}
