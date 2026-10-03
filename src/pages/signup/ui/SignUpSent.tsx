import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
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
 * Sign up's result (auth spec §2.3, §6.2): check your email, then log in; the coach may need
 * to approve the account first (approval can be switched off, triage 7). Focus
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
        description="Check your email to confirm, then log in. Your coach may need to approve your account first."
        focusOnMount
      />
      <div className="flex flex-col gap-4">
        <p className="text-body leading-normal">
          We sent the link to <span className="wrap-anywhere">{email}</span>.
        </p>
        {/* The build-time constant: a production build leaves the demo note out. */}
        {import.meta.env.VITE_DEMO === 'true' && (
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
