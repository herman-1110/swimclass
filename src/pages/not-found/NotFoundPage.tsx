import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { useWords } from '@/shared/i18n/context'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

import { notFoundPageWords } from './model/words'

/**
 * Any address the site doesn't have (auth spec §2.8), signed in or out, in the sign-in card.
 * "Go to the start" goes home, which sends each visitor on to their own start page.
 */
export function NotFoundPage() {
  const w = useWords(notFoundPageWords)
  return (
    <>
      <title>{`${w.title} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader size="auth" title={w.title} description={w.description} />
      <CardFooter>
        <ButtonLink to={ROUTES.home} variant="link">
          {w.goToStart}
        </ButtonLink>
      </CardFooter>
    </>
  )
}
