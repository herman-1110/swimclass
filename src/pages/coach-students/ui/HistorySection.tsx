import { type ReactNode, useId } from 'react'

import { type RetryableRead, useReadFailure } from '@/shared/lib/hooks/useReadFailure'
import { SectionLabel } from '@/shared/ui/SectionLabel'
import { Skeleton } from '@/shared/ui/Skeleton'

import { LoadError } from './LoadError'

type HistorySectionProps = {
  /** "Payments", "Lessons", "Group". */
  title: string
  /** The section's read: grey rows while it loads, the message and "Try again" if it fails. */
  read?: RetryableRead & { isPending: boolean }
  children: ReactNode
}

/** The look of a row in the History lists (coach-students §3.9): 12 px above and below, a rule. */
export const historyRow = 'flex flex-col gap-0.5 border-b border-line py-3 break-words'

const NO_READS: readonly RetryableRead[] = []

/**
 * A section of the History drawer (coach-students §3.9, proposed): a 13 px muted label, then
 * its rows. If its read never loaded, the message and "Try again" take the rows' place, and
 * stay while the read runs again; once the rows are in, focus goes to the section's heading.
 * A refresh that fails keeps the rows shown.
 */
export function HistorySection({ title, read, children }: HistorySectionProps) {
  const titleId = useId()
  const failure = useReadFailure(read ? [read] : NO_READS, () => document.getElementById(titleId))
  const loading = !failure && read?.isPending === true

  const body = () => {
    if (failure) return <LoadError className="mt-2" failure={failure} />
    if (loading) {
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
    return children
  }
  return (
    <section aria-labelledby={titleId} aria-busy={loading || undefined} className="flex flex-col">
      {/* Focusable, so "Try again" can hand focus to the rows it brought. */}
      <SectionLabel as="h3" id={titleId} tabIndex={-1}>
        {title}
      </SectionLabel>
      {loading && (
        <p role="status" className="sr-only">
          {`Loading ${title.toLowerCase()}…`}
        </p>
      )}
      {body()}
    </section>
  )
}
