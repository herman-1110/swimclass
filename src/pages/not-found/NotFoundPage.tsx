import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { CardFooter } from '@/shared/ui/CardFooter'
import { PageHeader } from '@/shared/ui/PageHeader'

const TITLE = 'Page not found'

/**
 * Any address the site doesn't have (auth spec §2.8), signed in or out, in the sign-in card.
 * "Go to the start" goes home, which sends each visitor on to their own start page.
 */
export function NotFoundPage() {
  return (
    <>
      <title>{`${TITLE} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader
        size="auth"
        title={TITLE}
        description="There’s no page at this address. Check the link, or go back to the start."
      />
      <CardFooter>
        <ButtonLink to={ROUTES.home} variant="link">
          Go to the start
        </ButtonLink>
      </CardFooter>
    </>
  )
}
