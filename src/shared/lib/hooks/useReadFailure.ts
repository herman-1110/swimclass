import { useEffect, useRef, useState } from 'react'

/** What the hook needs of a read: a TanStack Query result (useQuery) fits. */
export type RetryableRead = {
  data: unknown
  error: unknown
  isError: boolean
  isFetching: boolean
  /** When the read last failed (0: never): tells one failure from another. */
  errorUpdatedAt: number
  refetch: () => Promise<unknown>
}

export type ReadFailure = {
  /** The first failed read's error, for messageFor. */
  error: unknown
  /** When that failure happened. A retry that fails again changes it, even with the same
   *  words: key the alert by it, so the message is read out again. */
  failedAt: number
  /** "Try again" is running: its button stays where it is, busy, and keeps focus. */
  retrying: boolean
  /** Reads each failed read again: the "Try again" button's onClick. */
  retry: () => void
}

type Kept = { error: unknown; at: number } | null

/**
 * Reads shown with "Try again" in place of their data (a list, a week): the first failure,
 * or null while none of them has failed.
 *
 * TanStack forgets the error of a query that has no data as soon as it reads again (its
 * status goes back to pending), which would swap "Try again" for the loading look mid-retry
 * and drop its focus on the page. So each read's last error is kept, and still shown, until
 * that read answers: data clears it, a new failure replaces it. A kept error belongs to its
 * failure (errorUpdatedAt), so another week's error, or a closed panel's, never comes back.
 *
 * "Try again" goes with the error once the reads are in: if it still had focus, focus moves
 * to `focusAfter()` (the list's heading, the week) rather than falling to the page.
 */
export function useReadFailure(
  reads: readonly RetryableRead[],
  focusAfter: () => HTMLElement | null,
): ReadFailure | null {
  const [kept, setKept] = useState<readonly Kept[]>([])
  const retried = useRef(false)

  // Each read's last error, taken while it is the read's error (state derived while
  // rendering: React renders again at once, before anything is shown).
  const latest = reads.map((read, index): Kept =>
    read.isError ? { error: read.error, at: read.errorUpdatedAt } : (kept[index] ?? null),
  )
  if (latest.some((entry, index) => entry?.error !== kept[index]?.error)) setKept(latest)

  const failed = reads.flatMap((read, index) => {
    if (read.isError) return [{ read, error: read.error, at: read.errorUpdatedAt }]
    const last = kept[index]
    // Read again after this very failure, with nothing to show instead yet.
    return read.data === undefined && last && last.at === read.errorUpdatedAt
      ? [{ read, ...last }]
      : []
  })

  const recovered = failed.length === 0 && reads.every((read) => read.data !== undefined)
  useEffect(() => {
    if (!recovered || !retried.current) return
    retried.current = false
    const focused = document.activeElement
    if (focused === null || focused === document.body) focusAfter()?.focus()
  }, [recovered, focusAfter])

  if (failed.length === 0) return null
  return {
    error: failed[0].error,
    failedAt: failed[0].at,
    retrying: failed.some(({ read }) => read.isFetching),
    retry: () => {
      retried.current = true
      for (const { read } of failed) void read.refetch()
    },
  }
}
