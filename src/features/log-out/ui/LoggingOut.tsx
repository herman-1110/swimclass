import { useEffect, useRef } from 'react'
import { Link } from 'react-router'

import { AppError } from '@/shared/api/rpc'
import { ROUTES } from '@/shared/config/routes'

import { useEndSession } from '../api/useEndSession'

// DESIGN §6's wording. Move it to shared/config/messages.ts once that file exists.
function failureText(error: Error): string {
  return error instanceof AppError && error.code === 'network'
    ? 'Couldn’t reach the server. Check your connection and try again.'
    : 'Something went wrong. Refresh the page and try again.'
}

/**
 * What Log in shows in place of the form while "Log out" ends the session (RedirectIfSignedIn
 * renders it for LOG_OUT_REQUEST): "Logging out…" (auth spec §6.5), then the form, once the
 * session has ended. If ending it fails, the person is still signed in: they can try again,
 * or go back to their start page.
 */
export function LoggingOut() {
  const endSession = useEndSession()
  const { mutate } = endSession
  const started = useRef(false)

  useEffect(() => {
    // Once, even when React runs effects twice in development.
    if (started.current) return
    started.current = true
    mutate()
  }, [mutate])

  if (endSession.isError) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center text-sm">
        <p role="alert" className="leading-normal text-warn">
          {failureText(endSession.error)}
        </p>
        <div className="flex flex-wrap justify-center gap-x-4">
          <button
            type="button"
            onClick={() => mutate()}
            className="inline-flex min-h-11 items-center font-semibold text-accent hover:text-accent-hover"
          >
            Try again
          </button>
          <Link to={ROUTES.home} replace className="inline-flex min-h-11 items-center">
            Go to the start
          </Link>
        </div>
      </div>
    )
  }

  return (
    <p role="status" className="p-8 text-center text-sm text-muted">
      Logging out…
    </p>
  )
}
