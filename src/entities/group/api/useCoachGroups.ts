import { useQuery } from '@tanstack/react-query'

import { coachGroupsQuery } from './coachGroupsQuery'

/**
 * The coach's view of every group, active and paused, sorted by names (the Students
 * table's rows, Add booking's group list, Needs attention's names). Coach only: a customer
 * would get just their own groups, so customer screens use `useMyGroups`.
 */
export function useCoachGroups() {
  return useQuery(coachGroupsQuery())
}
