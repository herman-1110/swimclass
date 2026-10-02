import { useEffect } from 'react'
import { RouterProvider } from 'react-router/dom'

import { installHoverMotion } from '@/shared/lib/motion'

import { QueryProvider } from './providers/QueryProvider'
import { SessionProvider } from './providers/SessionProvider'
import { router } from './router/router'

export function App() {
  // Buttons lift under the mouse (DESIGN §5); one listener for the whole page.
  useEffect(() => installHoverMotion(), [])

  return (
    <QueryProvider>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryProvider>
  )
}
