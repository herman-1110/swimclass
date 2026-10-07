import { useWords } from '@/shared/i18n/context'

import { routerWords } from './words'
// Shown while the first page's code loads (for example opening /coach/schedule directly).
export function RouteLoading() {
  const w = useWords(routerWords)
  return (
    <p role="status" className="p-8 text-center text-sm text-muted">
      {w.loading}
    </p>
  )
}
