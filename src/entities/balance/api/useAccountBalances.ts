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

/**
 * One of the account's groups (Book's package card): the same request as
 * useAccountBalances, so switching groups needs no new one. `data` is null when the account
 * has no such group.
 */
export function useAccountBalance(accountId: string | null, groupId: string | null) {
  return useQuery({
    ...accountBalances(accountId),
    select: (balances) => balances.find((balance) => balance.group_id === groupId) ?? null,
  })
}
