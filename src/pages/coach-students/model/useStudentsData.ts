import { useMemo } from 'react'

import { useAccountNames, usePendingAccounts } from '@/entities/account'
import { useCoachBalances } from '@/entities/balance'
import { useCoachGroups } from '@/entities/group'
import { usePublicSettings } from '@/entities/settings'
import { useReadFailure } from '@/shared/lib/hooks/useReadFailure'

import { chosenTab } from '../ui/rowFocus'
import { packageRows } from './rows'

/**
 * Everything the list reads (coach-students §5.1 R1–R5): the groups, their balances, the
 * account holders' names, the accounts waiting for approval (the same read as the names)
 * and the public settings (prices for the payment panel). The rows are null until the first
 * three are in.
 *
 * `failure` is the first of those three that never loaded, with "Try again"; `waitingFailure`
 * the same for the Waiting for approval tab. A refresh that fails (after a write, or back on
 * the tab) keeps the rows on screen (coach-students §6); the next one tries again. Once
 * "Try again" has brought them, focus goes to the chosen filter tab, above what came back.
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

  return {
    rows,
    failure: useReadFailure([groups, balances, names], chosenTab),
    waiting,
    waitingFailure: useReadFailure([waiting], chosenTab),
    settings,
  }
}
