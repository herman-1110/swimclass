import { lazy, Suspense } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'

// Demo mode's tools (app/demo): never part of the real site. The check is on the build-time
// constant, not env.demo, so a production build leaves them out entirely, like the demo
// database (shared/api/backend.ts).
const DemoTools =
  import.meta.env.VITE_DEMO === 'true'
    ? lazy(async () => ({ default: (await import('@/app/demo/DemoTools')).DemoTools }))
    : null

export function RootLayout() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
      {DemoTools && (
        <Suspense fallback={null}>
          <DemoTools />
        </Suspense>
      )}
    </>
  )
}
