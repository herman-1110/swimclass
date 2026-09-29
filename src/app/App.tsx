import { RouterProvider } from 'react-router/dom'

import { QueryProvider } from './providers/QueryProvider'
import { SessionProvider } from './providers/SessionProvider'
import { router } from './router/router'

export function App() {
  return (
    <QueryProvider>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryProvider>
  )
}
