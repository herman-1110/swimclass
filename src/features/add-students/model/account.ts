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

/**
 * The Account select's value: the coach's choice (`null` until they make one) while it is
 * still one of the list. An account can leave the list behind the form (it became a coach,
 * or was removed: create_group then refuses and the list is read again). The select then
 * goes back to "Choose an account", never to another account, so what it shows is always
 * what Add sends.
 */
export function chosenAccount(
  choice: string | null,
  accounts: readonly { id: string }[],
  initialAccountId?: string | null,
): string {
  if (choice === null) return defaultAccount(accounts, initialAccountId)
  if (choice === '' || choice === NEW_ACCOUNT) return choice
  return accounts.some((account) => account.id === choice) ? choice : defaultAccount(accounts)
}
