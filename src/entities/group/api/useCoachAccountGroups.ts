import { useQuery } from '@tanstack/react-query'

import type { Group } from '../model/types'
import { coachGroupsQuery } from './coachGroupsQuery'

/**
 * One account's groups, active and paused, sorted by names, for the coach: Add students'
 * duplicate warning before it saves (coach-add-students §5.1 calls it `useAccountGroups`).
 * Selected from `useCoachGroups`' read, so switching accounts needs no request; empty
 * while the id is null. A customer's own groups (Book, My classes) come from `useMyGroups`.
 */
export function useCoachAccountGroups(accountId: string | null) {
  return useQuery({
    ...coachGroupsQuery(),
    select: (groups): Group[] =>
      accountId === null ? [] : groups.filter((group) => group.account_id === accountId),
  })
}
