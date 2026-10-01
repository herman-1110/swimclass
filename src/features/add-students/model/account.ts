import { NEW_ACCOUNT } from './types'

/**
 * The Account select's value before the coach picks one: the account in `?account=` when it
 * is one of the list (the spec §1), "Create a new account…" when there are no customer
 * accounts yet (§6, Empty), otherwise the "Choose an account" placeholder, so a group is never
 * added to the wrong family by default (C2).
 */
export function defaultAccount(
  accounts: readonly { id: string }[],
  initialAccountId?: string | null,
): string {
  if (accounts.length === 0) return NEW_ACCOUNT
  if (initialAccountId && accounts.some((account) => account.id === initialAccountId)) {
    return initialAccountId
  }
  return ''
}
