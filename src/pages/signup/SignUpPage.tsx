import { useState } from 'react'
import { useNavigate } from 'react-router'

import { SignUpForm } from '@/features/sign-up'
import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

import { SignUpSent } from './ui/SignUpSent'

const TITLE = 'Create an account'

/**
 * Sign up (auth spec §2.3; not drawn, so in Log in's card and style). Once the account
 * exists the form gives way to "Confirm your email". If Supabase signed the person in at
 * once (email confirmations off), they go home, where the guards send them to Waiting for
 * approval.
 */
export function SignUpPage() {
  const navigate = useNavigate()
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (sentTo !== null) return <SignUpSent email={sentTo} />

  return (
    <>
      <title>{`${TITLE} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader
        size="auth"
        title={TITLE}
        titleId="signup-title"
        description="Sign up to book lessons with your coach."
      />
      <SignUpForm
        labelledBy="signup-title"
        onSignedUp={({ email, confirmEmail }) => {
          if (confirmEmail) setSentTo(email)
          else void navigate(ROUTES.home, { replace: true })
        }}
      />
      <CardFooter>
        <ButtonLink to={ROUTES.login} variant="text" tone="ink">
          <span>
            Already have an account? <span className="font-semibold text-accent">Log in</span>
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
