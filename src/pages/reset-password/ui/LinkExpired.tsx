import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { useWords } from '@/shared/i18n/context'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

import { resetPageWords } from '../model/words'

type LinkExpiredProps = {
  /** Moves focus to the heading as it appears: it replaced the form (auth spec §7.5). */
  focusHeading?: boolean
}

/**
 * Set a new password with no session to set it for (auth spec §2.5): the link expired or was
 * used, or the page was opened directly while signed out.
 */
export function LinkExpired({ focusHeading = false }: LinkExpiredProps) {
  const w = useWords(resetPageWords)
  return (
    <>
      <title>{`${w.expiredTitle} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader
        size="auth"
        title={w.expiredTitle}
        description={w.expiredDescription}
        focusOnMount={focusHeading}
      />
      <ButtonLink to={ROUTES.forgotPassword} size="xl" block>
        {w.askNew}
      </ButtonLink>
      <CardFooter>
        <ButtonLink to={ROUTES.login} variant="link">
          {w.backToLogIn}
        </ButtonLink>
      </CardFooter>
    </>
  )
}
