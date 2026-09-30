import { useQuery } from '@tanstack/react-query'

import type { Group } from '../model/types'
import { coachGroupsQuery } from './coachGroupsQuery'

/**
 * One account's groups, active and paused, sorted by names, for the coach (Add students'
 * duplicate warning before it saves; coach-add-students §5.1): selected from
 * `useCoachGroups`' read, so switching accounts needs no request. Empty while the id is
 * null. A customer's own groups come from `useMyGroups` instead.
 */
export function useAccountGroups(accountId: string | null) {
  return useQuery({
    ...coachGroupsQuery(),
    select: (groups): Group[] =>
      accountId === null ? [] : groups.filter((group) => group.account_id === accountId),
  })
}
