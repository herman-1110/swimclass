import { queryOptions, useQuery } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'

import type { GroupBalance } from '../model/types'
import { balanceKeys } from './keys'

/** group_balance for every group: RLS shows the coach all of them (TECH_SPEC §6). */
const coachBalances = queryOptions({
  queryKey: balanceKeys.coach(),
  queryFn: async (): Promise<GroupBalance[]> =>
    (await readRows('group_balance', { order: [{ column: 'group_id' }] })) as GroupBalance[],
})

/**
 * Every group's balance, for the coach: the Students table and figures, Needs attention.
 * (A customer calling it gets only their own groups.)
 */
export function useCoachBalances() {
  return useQuery(coachBalances)
}

/**
 * One group's balance for the coach (lesson details, the Record payment panel): the same
 * request as useCoachBalances. `data` is null when there is no such group.
 */
export function useCoachBalance(groupId: string | null) {
  return useQuery({
    ...coachBalances,
    select: (balances) => balances.find((balance) => balance.group_id === groupId) ?? null,
  })
}
