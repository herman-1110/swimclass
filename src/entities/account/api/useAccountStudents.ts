import { queryOptions, useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'

import { readRows } from '@/shared/api/rpc'

import { sortStudents } from '../model/students'
import type { Student, StudentOrder } from '../model/types'
import { accountKeys } from './keys'

/**
 * Every active student the account may read: the coach reads all of them, a customer only
 * their own (RLS). One request serves every account the coach picks in Add students. The
 * hook orders each account's students itself (`sortStudents`), so the order here doesn't
 * matter.
 */
const activeStudents = queryOptions({
  queryKey: accountKeys.students(),
  queryFn: (): Promise<Student[]> => readRows('students', { eq: { active: true } }),
})

/**
 * One account's active students (none while no account is given).
 * - `added` (default): the order they were added (created_at, then id). Add students matches
 *   a typed name to the first student added with that name (its spec §5.3) and offers the
 *   names as suggestions.
 * - `name`: alphabetical, then by id: My classes' "Mei Ling’s account · Aiman & Sofia".
 *
 * Pass the account's id even for the signed-in customer's own students: RLS shows the coach
 * everyone's, and the filter keeps "View as customer" empty for him.
 */
export function useAccountStudents(
  accountId: string | null | undefined,
  { order = 'added' }: { order?: StudentOrder } = {},
) {
  const select = useCallback(
    (students: Student[]): Student[] =>
      sortStudents(
        students.filter((s) => s.account_id === accountId),
        order,
      ),
    [accountId, order],
  )
  return useQuery({ ...activeStudents, select })
}
