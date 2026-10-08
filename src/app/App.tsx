import { useEffect } from 'react'
import { RouterProvider } from 'react-router/dom'

import { installHoverMotion } from '@/shared/lib/motion'

import { AccountLanguage } from './providers/AccountLanguage'
import { LanguageProvider } from './providers/LanguageProvider'
import { QueryProvider } from './providers/QueryProvider'
import { SessionProvider } from './providers/SessionProvider'
import { router } from './router/router'

export function App() {
  // Buttons lift under the mouse (DESIGN §5); one listener for the whole page.
  useEffect(() => installHoverMotion(), [])

  return (
    <LanguageProvider>
      <QueryProvider>
        <SessionProvider>
          <AccountLanguage>
            <RouterProvider router={router} />
          </AccountLanguage>
        </SessionProvider>
      </QueryProvider>
    </LanguageProvider>
  )
}
