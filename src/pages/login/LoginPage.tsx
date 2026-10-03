import { LoginForm } from '@/features/log-in'
import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

const TITLE = 'Welcome back'

/**
 * Log in (design/Login.dc.html, LoginDesktop.dc.html; auth spec §2.2). AuthLayout draws the
 * card and the business name; RedirectIfSignedIn carries a signed-in visitor on, so the form
 * needs no navigation of its own.
 */
export function LoginPage() {
  return (
    <>
      <title>{`${TITLE} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader
        size="auth"
        title={TITLE}
        titleId="login-title"
        description="Log in to book lessons and check your package."
      />
      <LoginForm labelledBy="login-title" />
      <CardFooter>
        <ButtonLink to={ROUTES.signup} variant="text" tone="ink">
          <span>
            New here? <span className="font-semibold text-accent">Create an account</span>
          </span>
        </ButtonLink>
        {/* Signed-out pages can't read require_approval, so these words hold whether the coach
            approves accounts or not (triage 7, 3 Oct 2026). */}
        <p className="text-small leading-normal text-muted">
          Your coach may need to approve your account before you can book.
        </p>
      </CardFooter>
    </>
  )
}
