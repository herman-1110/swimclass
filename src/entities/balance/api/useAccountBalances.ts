import { queryOptions, useQuery } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'

import type { GroupBalance } from '../model/types'
import { balanceKeys } from './keys'

/**
 * group_balance for one account's groups. RLS lets the coach read every account's rows
 * (TECH_SPEC §6), so the account filter is what keeps "View as customer" empty for him.
 */
function accountBalances(accountId: string | null) {
  return queryOptions({
    queryKey: balanceKeys.account(accountId),
    queryFn: async (): Promise<GroupBalance[]> =>
      (await readRows('group_balance', {
        eq: { account_id: accountId ?? '' },
        order: [{ column: 'group_id' }],
      })) as GroupBalance[],
    enabled: accountId !== null,
  })
}

/**
 * Every group's balance for the signed-in customer (pass `useUserId()`): My classes'
 * packages. Waits while the id is null.
 */
export function useAccountBalances(accountId: string | null) {
  return useQuery(accountBalances(accountId))
}
