import { useEffect, useRef } from 'react'
import { useRouteError } from 'react-router'

import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'

// Last-resort error screen for anything a page didn't handle itself, including a page's
// code failing to download (a dropped connection, or an old file after a new release).
// Reloading fetches the current files, so that is the first thing to offer. It replaces
// the page, so focus moves to its h1: a screen reader reads the error out and Tab goes on
// from there, as on the other screens that swap a page for a result (auth spec §7.5).
export function RouteError() {
  const error = useRouteError()
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    console.error(error)
  }, [error])

  useEffect(() => {
    heading.current?.focus()
  }, [])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-3 px-7 pt-18 pb-10">
      <title>{`Something went wrong · ${DEFAULT_BUSINESS_NAME}`}</title>
      <h1 ref={heading} tabIndex={-1} className="text-title font-semibold">
        Something went wrong
      </h1>
      <p className="text-muted">
        This page couldn’t load. Check your connection, then reload the page. If it still doesn’t
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
        <a href={ROUTES.home} className="inline-flex min-h-11 items-center">
          Go to the start
        </a>
      </p>
    </main>
  )
}
