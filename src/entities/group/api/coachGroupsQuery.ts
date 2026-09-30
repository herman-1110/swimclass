import { queryOptions } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'

import { byNames } from '../model/order'
import type { Group } from '../model/types'
import { groupKeys } from './keys'

/**
 * Every group, sorted by names: the coach's one read of `group_details` (RLS lets him see
 * all of them; data-contracts §3.6). The coach's narrower hooks select from it, so moving
 * between groups or accounts needs no new request.
 */
export function coachGroupsQuery() {
  return queryOptions({
    queryKey: groupKeys.coach(),
    queryFn: async (): Promise<Group[]> =>
      ((await readRows('group_details')) as Group[]).toSorted(byNames),
  })
}
