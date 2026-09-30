import { useId } from 'react'

import { messageFor } from '@/shared/config/messages'
import { cn } from '@/shared/lib/cn'
import { plural } from '@/shared/lib/format'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'
import { SectionTitle } from '@/shared/ui/SectionTitle'
import { Skeleton } from '@/shared/ui/Skeleton'

import type { EmailLogRow } from '../model/types'
import { EmailLogList } from './EmailLogList'

/** What EmailLogView needs of the query (useEmailLog's result has all of it). */
export type EmailLogQueryState = {
  data?: readonly EmailLogRow[]
  isPending: boolean
  isError: boolean
  error: unknown
  refetch: () => unknown
}

type EmailLogViewProps = {
  limit: number
  query: EmailLogQueryState
  className?: string
}

/**
 * The Email log section of Settings (the Settings spec §2.6 and §5.7, proposed): the
 * title "Email log", its note, then the list, a skeleton while it loads, or the error with
 * "Try again". `id="email-log"` is its deep link.
 */
export function EmailLogView({ limit, query, className }: EmailLogViewProps) {
  const titleId = useId()
  return (
    <section
      id="email-log"
      aria-labelledby={titleId}
      aria-busy={query.isPending || undefined}
      className={cn('flex min-w-0 scroll-mt-6 flex-col leading-[normal]', className)}
    >
      <SectionTitle id={titleId} note={`The last ${plural(limit, 'email')}, newest first.`}>
        Email log
      </SectionTitle>
      {query.isPending ? (
        <>
          <p role="status" className="sr-only">
            Loading the email log…
          </p>
          <Skeleton shape="frame" className="h-40" />
        </>
      ) : query.isError ? (
        <Banner
          role="alert"
          action={
            <Button variant="link" textSize="label" onClick={() => void query.refetch()}>
              Try again
            </Button>
          }
        >
          {messageFor(query.error, { audience: 'coach' })}
        </Banner>
      ) : (
        <EmailLogList rows={query.data ?? []} labelledBy={titleId} />
      )}
    </section>
  )
}
