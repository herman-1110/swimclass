import { LoginForm } from '@/features/log-in'
import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { useWords } from '@/shared/i18n/context'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

import { loginPageWords } from './model/words'

/**
 * Log in (design/Login.dc.html, LoginDesktop.dc.html; auth spec §2.2). AuthLayout draws the
 * card and the business name; RedirectIfSignedIn carries a signed-in visitor on, so the form
 * needs no navigation of its own.
 */
export function LoginPage() {
  const w = useWords(loginPageWords)
  return (
    <>
      <title>{`${w.title} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader size="auth" title={w.title} titleId="login-title" description={w.description} />
      <LoginForm labelledBy="login-title" />
      <CardFooter>
        <ButtonLink to={ROUTES.signup} variant="text" tone="ink">
          <span>
            {w.newHere} <span className="font-semibold text-accent">{w.createAccount}</span>
          </span>
        </ButtonLink>
        {/* Signed-out pages can't read require_approval, so these words hold whether the coach
            approves accounts or not (triage 7, 3 Oct 2026). */}
        <p className="text-small leading-normal text-muted">{w.approvalNote}</p>
      </CardFooter>
    </>
  )
}
