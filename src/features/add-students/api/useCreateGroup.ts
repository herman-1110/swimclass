import { type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query'

import { accountKeys } from '@/entities/account'
import { balanceKeys } from '@/entities/balance'
import { groupKeys } from '@/entities/group'
import { paymentKeys } from '@/entities/payment'
import { settingsKeys } from '@/entities/settings'
import { rpc, toAppError } from '@/shared/api/rpc'

import type { PaidBy, StudentItem } from '../model/types'

export type CreateGroupInput = {
  accountId: string
  /** In row order, so a refusal's {index} is the row's number. */
  students: readonly StudentItem[]
  /** The pool; the database trims it. */
  location: string
  firstPackagePaid: boolean
  /** When paid: cents, or null for the type's price (the database refuses with
   *  `price_not_set` while there is none). */
  amountCents: number | null
  /** When paid: how. */
  method: PaidBy | null
  /** The starting balance (BR-25): lessons used and paid before the app. */
  openingUsed: number
  openingPaid: number
}

// The refusals that mean the form was out of date (the spec §5.5): the account's students
// changed (a typed name may match now), the students per lesson changed, or the account
// isn't there any more.
function staleAfter(error: unknown): QueryKey[] {
  switch (toAppError(error).code) {
    case 'invalid_students':
    case 'student_other_account':
    case 'not_found':
    case 'not_customer':
      return [accountKeys.all]
    case 'group_full':
      return [settingsKeys.all]
    default:
      return []
  }
}

/**
 * `create_group` (TECH_SPEC §5.3; the coach only): a new group of an account's students,
 * existing ones by id and new ones by name, with its pool, an optional first payment and a
 * starting balance. Resolves to the new group's id once the screens' data is fresh: the
 * groups, the balances, the account's students and, when paid, the payments
 * (data-contracts §3.6, §8). After a refusal that means the form was out of date it
 * refreshes what changed first, so the form shows the error with fresh data.
 */
export function useCreateGroup() {
  const queryClient = useQueryClient()
  const refresh = (keys: readonly QueryKey[]) =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))

  return useMutation({
    mutationFn: (input: CreateGroupInput) =>
      rpc('create_group', {
        p_account_id: input.accountId,
        p_students: [...input.students],
        p_location: input.location,
        p_first_package_paid: input.firstPackagePaid,
        // Left out means null (the function's defaults), which the generated types can't say.
        p_amount_cents: input.firstPackagePaid ? (input.amountCents ?? undefined) : undefined,
        p_method: input.firstPackagePaid ? (input.method ?? undefined) : undefined,
        p_opening_used: input.openingUsed,
        p_opening_paid: input.openingPaid,
      }),
    onSuccess: (_groupId, input) =>
      refresh([
        groupKeys.all,
        balanceKeys.all,
        accountKeys.all,
        ...(input.firstPackagePaid ? [paymentKeys.all] : []),
      ]),
    onError: (error) => refresh(staleAfter(error)),
  })
}
