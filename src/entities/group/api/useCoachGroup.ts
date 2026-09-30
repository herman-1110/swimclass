import { useQuery } from '@tanstack/react-query'

import type { Group } from '../model/types'
import { coachGroupsQuery } from './coachGroupsQuery'

/**
 * One group's details for the coach (History, Record payment, Edit group): selected from
 * `useCoachGroups`' read, so it costs no request of its own. `data` is null when no group
 * has that id (or the id is null), for example an old `?history=` link.
 */
export function useCoachGroup(groupId: string | null) {
  return useQuery({
    ...coachGroupsQuery(),
    select: (groups): Group | null => groups.find((group) => group.group_id === groupId) ?? null,
  })
}
