import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { env } from '@/shared/config/env'
import { ROUTES } from '@/shared/config/routes'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

type SignUpSentProps = {
  /** Where the confirmation link went. */
  email: string
}

const TITLE = 'Confirm your email'

/**
 * Sign up's result (auth spec §2.3, §6.2): check your email, then wait for the coach. Focus
 * moves to the heading, since it replaces the form. Demo mode sends no email and counts the
 * address as confirmed, and says so.
 */
export function SignUpSent({ email }: SignUpSentProps) {
  return (
    <>
      <title>{`${TITLE} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader
        size="auth"
        title={TITLE}
        description="Check your email to confirm, then wait for your coach to approve your account."
        focusOnMount
      />
      <div className="flex flex-col gap-4">
        <p className="text-body leading-normal">
          We sent the link to <span className="wrap-anywhere">{email}</span>.
        </p>
        {env.demo && (
          <p className="rounded-control bg-subtle px-3.5 py-3 text-label leading-normal text-muted">
            Demo mode sends no email, and the address counts as confirmed: you can log in now.
          </p>
        )}
      </div>
      <CardFooter>
        <ButtonLink to={ROUTES.login} variant="link">
          Back to log in
        </ButtonLink>
      </CardFooter>
    </>
  )
}
