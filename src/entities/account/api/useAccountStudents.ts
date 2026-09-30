import { queryOptions, useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'

import { readRows } from '@/shared/api/rpc'

import type { Student } from '../model/types'
import { accountKeys } from './keys'

/**
 * Every active student the account may read, in the order they were added (created_at,
 * then id): the coach reads all of them, a customer only their own (RLS). One request
 * serves every account the coach picks in Add students.
 */
const activeStudents = queryOptions({
  queryKey: accountKeys.students(),
  queryFn: (): Promise<Student[]> =>
    readRows('students', {
      eq: { active: true },
      order: [{ column: 'created_at' }, { column: 'id' }],
    }),
})

const collator = new Intl.Collator('en', { sensitivity: 'base' })

export type StudentOrder = 'added' | 'name'

/**
 * One account's active students (none while no account is given).
 * - `added` (default): the order they were added. Add students matches a typed name to the
 *   first student added with that name (its spec §5.3) and offers the names as suggestions.
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
    (students: Student[]): Student[] => {
      const mine = students.filter((s) => s.account_id === accountId)
      return order === 'name'
        ? mine.toSorted((a, b) => collator.compare(a.name, b.name) || a.id.localeCompare(b.id))
        : mine
    },
    [accountId, order],
  )
  return useQuery({ ...activeStudents, select })
}
