import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { useWords } from '@/shared/i18n/context'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

import { forgotPageWords } from '../model/words'

type ResetLinkSentProps = {
  /** The address the link was asked for. */
  email: string
}

/**
 * Forgot password's result (auth spec §2.4, §6.3): the same words whether or not an account
 * uses the address, so the page never tells who has an account. Focus moves to the heading,
 * since it replaces the form. Demo mode sends no email, and says what to do instead.
 */
export function ResetLinkSent({ email }: ResetLinkSentProps) {
  const w = useWords(forgotPageWords)
  return (
    <>
      <title>{`${w.sentTitle} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader
        size="auth"
        title={w.sentTitle}
        description={
          <>
            {w.sentBefore}
            <span className="wrap-anywhere">{email}</span>
            {w.sentAfter}
          </>
        }
        focusOnMount
      />
      {/* The build-time constant: a production build leaves the demo note out. */}
      {import.meta.env.VITE_DEMO === 'true' && (
        <p className="rounded-control bg-subtle px-3.5 py-3 text-label leading-normal text-muted">
          {w.demoNote}
        </p>
      )}
      <CardFooter>
        <ButtonLink to={ROUTES.login} variant="link">
          {w.backToLogIn}
        </ButtonLink>
      </CardFooter>
    </>
  )
}
