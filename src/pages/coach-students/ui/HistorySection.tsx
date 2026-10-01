import { type ReactNode, useId } from 'react'

import { SectionLabel } from '@/shared/ui/SectionLabel'
import { Skeleton } from '@/shared/ui/Skeleton'

import { LoadError } from './LoadError'

type HistorySectionProps = {
  /** "Payments", "Lessons", "Group". */
  title: string
  /** The section's read: grey rows while it loads, the message and "Try again" if it fails. */
  read?: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown }
  children: ReactNode
}

/** The look of a row in the History lists (coach-students §3.9): 12 px above and below, a rule. */
export const historyRow = 'flex flex-col gap-0.5 border-b border-line py-3 break-words'

/**
 * A section of the History drawer (coach-students §3.9, proposed): a 13 px muted label, then
 * its rows.
 */
export function HistorySection({ title, read, children }: HistorySectionProps) {
  const titleId = useId()
  const body = () => {
    if (read?.isPending) {
      return (
        <div aria-hidden="true">
          {[0, 1].map((key) => (
            <div key={key} className={historyRow}>
              <Skeleton shape="line" className="h-4 w-3/5" />
              <Skeleton shape="line" className="h-4 w-2/5" />
            </div>
          ))}
        </div>
      )
    }
    if (read?.isError) {
      return <LoadError className="mt-2" error={read.error} onRetry={() => void read.refetch()} />
    }
    return children
  }
  return (
    <section
      aria-labelledby={titleId}
      aria-busy={read?.isPending || undefined}
      className="flex flex-col"
    >
      <SectionLabel as="h3" id={titleId}>
        {title}
      </SectionLabel>
      {read?.isPending && (
        <p role="status" className="sr-only">
          {`Loading ${title.toLowerCase()}…`}
        </p>
      )}
      {body()}
    </section>
  )
}
