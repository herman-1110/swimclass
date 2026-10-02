import { useCallback, useId } from 'react'

import { messageFor } from '@/shared/config/messages'
import { cn } from '@/shared/lib/cn'
import { plural } from '@/shared/lib/format'
import { useReadFailure } from '@/shared/lib/hooks/useReadFailure'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'
import { SectionTitle } from '@/shared/ui/SectionTitle'
import { Skeleton } from '@/shared/ui/Skeleton'

import type { EmailLogRow } from '../model/types'
import { EmailLogList } from './EmailLogList'

/** What EmailLogView needs of the query (useEmailLog's result has all of it). isFetching
 *  and errorUpdatedAt keep "Try again" in place, busy, while it reads again. */
export type EmailLogQueryState = {
  data: readonly EmailLogRow[] | undefined
  isPending: boolean
  isError: boolean
  isFetching: boolean
  error: unknown
  errorUpdatedAt: number
  refetch: () => Promise<unknown>
}

type EmailLogViewProps = {
  limit: number
  query: EmailLogQueryState
  className?: string
}

/**
 * The Email log section of Settings (the Settings spec §2.6 and §5.7, proposed): the
 * title "Email log", its note, then the list, a skeleton while it loads, or the error with
 * "Try again". `id="email-log"` is its deep link. "Try again" stays, busy, while the log is
 * read again, and focus then goes to the title, not the page.
 */
export function EmailLogView({ limit, query, className }: EmailLogViewProps) {
  const titleId = useId()
  const failure = useReadFailure(
    [query],
    useCallback(() => document.getElementById(titleId), [titleId]),
  )
  return (
    <section
      id="email-log"
      aria-labelledby={titleId}
      aria-busy={(query.isPending && !failure) || undefined}
      className={cn('flex min-w-0 scroll-mt-6 flex-col leading-[normal]', className)}
    >
      <SectionTitle
        id={titleId}
        tabIndex={-1}
        note={`The last ${plural(limit, 'email')}, newest first.`}
      >
        Email log
      </SectionTitle>
      {failure ? (
        <Banner
          // A new alert for each failure: one that fails again is read out again.
          key={failure.failedAt}
          role="alert"
          action={
            <Button
              variant="link"
              textSize="label"
              pending={failure.retrying}
              onClick={failure.retry}
            >
              Try again
            </Button>
          }
        >
          {messageFor(failure.error, { audience: 'coach' })}
        </Banner>
      ) : query.isPending ? (
        <>
          <p role="status" className="sr-only">
            Loading the email log…
          </p>
          <Skeleton shape="frame" className="h-40" />
        </>
      ) : (
        <EmailLogList rows={query.data ?? []} labelledBy={titleId} />
      )}
    </section>
  )
}
