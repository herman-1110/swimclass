import { useEffect, useRef } from 'react'
import { useRouteError } from 'react-router'

import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { ROUTES } from '@/shared/config/routes'
import { useWords } from '@/shared/i18n/context'

import { routerWords } from './words'

// Last-resort error screen for anything a page didn't handle itself, including a page's
// code failing to download (a dropped connection, or an old file after a new release).
// Reloading fetches the current files, so that is the first thing to offer. It replaces
// the page, so focus moves to its h1: a screen reader reads the error out and Tab goes on
// from there, as on the other screens that swap a page for a result (auth spec §7.5).
export function RouteError() {
  const error = useRouteError()
  const heading = useRef<HTMLHeadingElement>(null)
  const w = useWords(routerWords)

  useEffect(() => {
    console.error(error)
  }, [error])

  useEffect(() => {
    heading.current?.focus()
  }, [])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-3 px-7 pt-18 pb-10">
      <title>{`${w.errorTitle} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <h1 ref={heading} tabIndex={-1} className="text-title font-semibold">
        {w.errorTitle}
      </h1>
      <p className="text-muted">{w.errorText}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 h-[50px] rounded-control bg-accent px-5 font-semibold text-white hover:bg-accent-hover"
      >
        {w.reload}
      </button>
      <p className="m-0 self-center">
        <a href={ROUTES.home} className="inline-flex min-h-11 items-center">
          {w.goToStart}
        </a>
      </p>
    </main>
  )
}
