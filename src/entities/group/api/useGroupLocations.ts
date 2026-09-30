import { useQuery } from '@tanstack/react-query'

import { distinctLocations } from '../model/order'
import { coachGroupsQuery } from './coachGroupsQuery'

/**
 * The pool locations the coach's groups use, each once, in reading order: the
 * suggestions for Add students' Pool location (coach-add-students §5.1; the seed gives
 * Kiara Park, Maple Condo, Palm Court, Seri Maya, Sunrise Res., Vista Heights). Selected
 * from `useCoachGroups`' read. Coach only.
 */
export function useGroupLocations() {
  return useQuery({ ...coachGroupsQuery(), select: distinctLocations })
}
