import { skipToken, useQuery } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'

import type { Group } from '../model/types'
import { groupKeys } from './keys'

/**
 * A customer's own groups, active and paused, oldest first (`created_at`, then id), as
 * Book's "Who’s this lesson for?" and My classes list them (data-contracts §3.6). Book's
 * picker and My classes' packages show the `active` ones; paused groups still name past
 * lessons.
 *
 * Pass the signed-in account's id (`useUserId()` from entities/account). The filter is
 * needed even though RLS scopes customers: RLS shows the coach every group, and the
 * coach's "View as customer" must find none of his own. Nothing is read while the id is
 * null.
 */
export function useMyGroups(accountId: string | null) {
  return useQuery({
    queryKey: groupKeys.mine(accountId),
    queryFn:
      accountId === null
        ? skipToken
        : async (): Promise<Group[]> =>
            (await readRows('group_details', {
              eq: { account_id: accountId },
              order: [{ column: 'created_at' }, { column: 'group_id' }],
            })) as Group[],
  })
}
