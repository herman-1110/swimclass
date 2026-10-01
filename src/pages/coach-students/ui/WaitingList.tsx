import type { PendingAccount } from '@/entities/account'
import type { Instant } from '@/shared/lib/time'
import { Button } from '@/shared/ui/Button'
import { EmptyState } from '@/shared/ui/EmptyState'

import { LoadError } from './LoadError'
import { StudentsLoading } from './StudentsLoading'
import { WaitingAccounts } from './WaitingAccounts'

type WaitingListProps = {
  /** The waiting accounts that match the search; null while loading. */
  accounts: readonly PendingAccount[] | null
  /** The read's failure, if it failed. */
  error: unknown
  onRetry: () => void
  query: string
  onClearSearch: () => void
  now: Instant
  onNotice: (notice: string) => void
}

/**
 * The Waiting for approval tab (coach-students C1, §6): the accounts, or why there are none
 * ("No accounts are waiting for approval.", the seed's case).
 */
export function WaitingList({
  accounts,
  error,
  onRetry,
  query,
  onClearSearch,
  now,
  onNotice,
}: WaitingListProps) {
  if (error) return <LoadError error={error} onRetry={onRetry} />
  if (!accounts) return <StudentsLoading />
  if (accounts.length > 0) {
    return <WaitingAccounts accounts={accounts} now={now} onNotice={onNotice} />
  }
  if (query.trim() === '') return <EmptyState>No accounts are waiting for approval.</EmptyState>
  return (
    <EmptyState
      action={
        <Button variant="link" flush onClick={onClearSearch}>
          Clear search
        </Button>
      }
    >
      {`No accounts match “${query.trim()}”.`}
    </EmptyState>
  )
}
