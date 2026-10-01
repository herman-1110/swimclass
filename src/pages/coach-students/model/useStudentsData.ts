import { useMemo } from 'react'

import { useAccountNames, usePendingAccounts } from '@/entities/account'
import { useCoachBalances } from '@/entities/balance'
import { useCoachGroups } from '@/entities/group'
import { usePublicSettings } from '@/entities/settings'

import { packageRows } from './rows'

/**
 * Everything the list reads (coach-students §5.1 R1–R5): the groups, their balances, the
 * account holders' names, the accounts waiting for approval (the same read as the names)
 * and the public settings (prices for the payment panel). The rows are null until the first
 * three are in; `error` is the first of them that failed, and `retry` reads the failed ones
 * again.
 */
export function useStudentsData() {
  const groups = useCoachGroups()
  const balances = useCoachBalances()
  const names = useAccountNames()
  const waiting = usePendingAccounts()
  const settings = usePublicSettings()

  const rows = useMemo(
    () =>
      groups.data && balances.data && names.data
        ? packageRows(groups.data, balances.data, names.data)
        : null,
    [groups.data, balances.data, names.data],
  )
  const reads = [groups, balances, names]
  const failed = reads.find((read) => read.isError)

  return {
    rows,
    error: failed ? failed.error : null,
    retry: () => {
      for (const read of reads) if (read.isError) void read.refetch()
    },
    waiting,
    settings,
  }
}
