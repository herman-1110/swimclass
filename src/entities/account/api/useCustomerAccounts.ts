import { queryOptions, useQuery } from '@tanstack/react-query'

import { readRows } from '@/shared/api/rpc'

import { byDisplayName, bySignUp, toPendingAccount } from '../model/accounts'
import type { CustomerAccount, PendingAccount, PendingAccountOrder } from '../model/types'
import { accountKeys } from './keys'

/**
 * Every customer profile the account may read, by display name: the coach reads them all
 * (RLS; data-contracts §3.1), a customer only their own. One request serves the account
 * picker, the account names on the coach's screens and the waiting list: the hooks below
 * each select from it, so switching between them fetches nothing.
 */
const customerAccounts = queryOptions({
  queryKey: accountKeys.customers(),
  queryFn: async (): Promise<CustomerAccount[]> =>
    (await readRows('profiles', { eq: { role: 'customer' } })).toSorted(byDisplayName),
})

// Module-level selectors, so TanStack Query keeps each result until the data changes.
const approvedOnly = (accounts: CustomerAccount[]) => accounts.filter((a) => a.approved)

const namesById = (accounts: CustomerAccount[]): ReadonlyMap<string, string> =>
  new Map(accounts.map((a) => [a.id, a.display_name]))

const waitingBy =
  (compare: (a: CustomerAccount, b: CustomerAccount) => number) =>
  (accounts: CustomerAccount[]): PendingAccount[] =>
    accounts
      .filter((a) => !a.approved)
      .toSorted(compare)
      .map(toPendingAccount)

const waiting: Record<PendingAccountOrder, (accounts: CustomerAccount[]) => PendingAccount[]> = {
  signup: waitingBy(bySignUp),
  name: waitingBy(byDisplayName),
}

/**
 * The coach's approved customer accounts, by display name: Add students' account picker
 * ("Mei Ling · meiling" with `accountOptionLabel`). Accounts still waiting for approval are
 * left out (the Add students spec, C17); they are in `usePendingAccounts`.
 */
export function useCustomerAccounts() {
  return useQuery({ ...customerAccounts, select: approvedOnly })
}

/**
 * Every customer account's display name by id, for "Farah’s account" on the coach's
 * screens (`accountLabel` in entities/group): the Students table, Add booking's group list,
 * Record payment.
 */
export function useAccountNames() {
  return useQuery({ ...customerAccounts, select: namesById })
}

/**
 * Accounts waiting for approval, for the schedule's Needs attention and the Waiting for
 * approval tab. Until `pending_accounts()` exists (prompt 09) this reads `profiles`, so there
 * is no email (the Students spec §5.1 R5; the Schedule spec R5).
 * - `signup` (default): oldest sign-up first, then by id (the Waiting for approval tab).
 * - `name`: by display name, then username (Needs attention: "within waiting: by name").
 * Both orders select from the same request.
 */
export function usePendingAccounts({ order = 'signup' }: { order?: PendingAccountOrder } = {}) {
  return useQuery({ ...customerAccounts, select: waiting[order] })
}
