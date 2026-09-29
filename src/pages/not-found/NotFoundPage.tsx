import { Link } from 'react-router'

import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-3 px-7 pt-18 pb-10">
      <title>{`Page not found · ${DEFAULT_BUSINESS_NAME}`}</title>
      <h1 className="text-title font-semibold">Page not found</h1>
      <p className="text-muted">
        There's no page at this address. Check the link, or go back to the start.
      </p>
      <p>
        <Link to={ROUTES.home} className="inline-flex min-h-11 items-center font-semibold">
          Go to the start
        </Link>
      </p>
    </main>
  )
}
