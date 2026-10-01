import { useState } from 'react'

import { ForgotPasswordForm } from '@/features/reset-password'
import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

import { ResetLinkSent } from './ui/ResetLinkSent'

// The link that opens this page says "Forgot username or password?"; the heading keeps the
// route test's "Forgot your password?" (conventions §12.3), and the text says the link shows
// the username too (auth spec C9).
const TITLE = 'Forgot your password?'

/**
 * Forgot password (auth spec §2.4; not drawn, so in Log in's card and style). Once the link
 * is asked for, the form gives way to "Check your email", whether or not an account uses the
 * address.
 */
export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (sentTo !== null) return <ResetLinkSent email={sentTo} />

  return (
    <>
      <title>{`${TITLE} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader
        size="auth"
        title={TITLE}
        titleId="forgot-title"
        description="Enter the email you signed up with. We’ll send you a link that shows your username and lets you set a new password."
      />
      <ForgotPasswordForm labelledBy="forgot-title" onSent={setSentTo} />
      <CardFooter>
        <ButtonLink to={ROUTES.login} variant="link">
          Back to log in
        </ButtonLink>
      </CardFooter>
    </>
  )
}
