import { useState } from 'react'

import { ForgotPasswordForm } from '@/features/reset-password'
import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { useWords } from '@/shared/i18n/context'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

import { forgotPageWords } from './model/words'
import { ResetLinkSent } from './ui/ResetLinkSent'

// The heading matches the link that opens this page, "Forgot username or password?", since
// the emailed link shows the username too (auth spec C9; copy-8, 3 Oct 2026, in place of
// conventions §12.3's "Forgot your password?").
/**
 * Forgot password (auth spec §2.4; not drawn, so in Log in's card and style). Once the link
 * is asked for, the form gives way to "Check your email", whether or not an account uses the
 * address.
 */
export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const w = useWords(forgotPageWords)

  if (sentTo !== null) return <ResetLinkSent email={sentTo} />

  return (
    <>
      <title>{`${w.title} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader size="auth" title={w.title} titleId="forgot-title" description={w.description} />
      <ForgotPasswordForm labelledBy="forgot-title" onSent={setSentTo} />
      <CardFooter>
        <ButtonLink to={ROUTES.login} variant="link">
          {w.backToLogIn}
        </ButtonLink>
      </CardFooter>
    </>
  )
}
