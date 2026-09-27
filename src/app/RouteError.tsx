import { useEffect } from 'react'
import { useRouteError } from 'react-router'
import { DEFAULT_BUSINESS_NAME } from '../lib/business'

// Last-resort error screen for anything a page didn't handle itself, including a page's
// code failing to download (a dropped connection, or an old file after a new release).
// Reloading fetches the current files, so that is the first thing to offer.
export function RouteError() {
  const error = useRouteError()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-3 px-7 pt-18 pb-10">
      <title>{`Something went wrong · ${DEFAULT_BUSINESS_NAME}`}</title>
      <h1 className="text-title font-semibold">Something went wrong</h1>
      <p className="text-muted">
        This page couldn't load. Check your connection, then reload the page. If it still doesn't
        load, try again in a few minutes.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 h-[50px] rounded-control bg-accent px-5 font-semibold text-white hover:bg-accent-hover"
      >
        Reload the page
      </button>
      <p className="m-0 self-center">
        <a href="/" className="inline-flex min-h-11 items-center">
          Go to the start
        </a>
      </p>
    </main>
  )
}
