import { useEffect, useEffectEvent, useRef } from 'react'

import type { PendingAccount } from '@/entities/account'
import type { ReadFailure } from '@/shared/lib/hooks/useReadFailure'
import type { Instant } from '@/shared/lib/time'
import { Button } from '@/shared/ui/Button'
import { EmptyState } from '@/shared/ui/EmptyState'

import { EMPTY_TAB, noMatchText } from '../model/copy'
import { LoadError } from './LoadError'
import { approveButton, type WaitingPlace } from './rowFocus'
import { StudentsLoading } from './StudentsLoading'
import { WaitingAccounts } from './WaitingAccounts'

type WaitingListProps = {
  /** The waiting accounts that match the search; null while loading. */
  accounts: readonly PendingAccount[] | null
  /** The read never loaded: its message and "Try again" (useReadFailure). */
  failure: ReadFailure | null
  query: string
  onClearSearch: () => void
  now: Instant
  onNotice: (notice: string) => void
  /** The last account has left the list: focus goes to the notice. */
  onEmptied: () => void
}

/**
 * The Waiting for approval tab (coach-students C1, §6): the accounts, or why there are none
 * ("No accounts are waiting for approval.", the seed's case). An approved account leaves the
 * list with its button, so focus goes to the account now in its place, or to the notice when
 * none are left.
 */
export function WaitingList({
  accounts,
  failure,
  query,
  onClearSearch,
  now,
  onNotice,
  onEmptied,
}: WaitingListProps) {
  const left = useRef<WaitingPlace | null>(null)
  const emptied = useEffectEvent(onEmptied)
  useEffect(() => {
    const place = left.current
    if (!place || !accounts || accounts.some((account) => account.id === place.id)) return
    left.current = null
    // Only focus that went with the button: the coach may have moved on meanwhile.
    if (document.activeElement !== null && document.activeElement !== document.body) return
    const next = accounts.at(Math.min(place.index, accounts.length - 1))
    if (next) approveButton(place.layout, next.id)?.focus()
    else emptied()
  }, [accounts])

  if (failure) return <LoadError failure={failure} />
  if (!accounts) return <StudentsLoading />
  if (accounts.length > 0) {
    return (
      <WaitingAccounts
        accounts={accounts}
        now={now}
        onLeave={(place, notice) => {
          left.current = place
          onNotice(notice)
        }}
      />
    )
  }
  if (query.trim() === '') return <EmptyState>{EMPTY_TAB.waiting}</EmptyState>
  return (
    <EmptyState
      action={
        <Button variant="link" flush onClick={onClearSearch}>
          Clear search
        </Button>
      }
    >
      {noMatchText('waiting', query)}
    </EmptyState>
  )
}
