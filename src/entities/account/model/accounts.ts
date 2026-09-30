import { possessive } from '@/shared/lib/format'

import type { PendingAccount, Profile } from './types'

// Names sort as people read them, ignoring case and accents. The demo database sorts in
// byte order (collation C), where "Zulaikha" comes before "aina" (the Add students spec §5.1).
const collator = new Intl.Collator('en', { sensitivity: 'base' })

/** By display name, then username (unique), so the order never depends on the database's. */
export function byDisplayName(
  a: Pick<Profile, 'display_name' | 'username'>,
  b: Pick<Profile, 'display_name' | 'username'>,
): number {
  return (
    collator.compare(a.display_name, b.display_name) || collator.compare(a.username, b.username)
  )
}

/** Oldest sign-up first (Waiting for approval, the Students spec §5.1 R5), then by id. */
export function bySignUp(
  a: Pick<Profile, 'created_at' | 'id'>,
  b: Pick<Profile, 'created_at' | 'id'>,
): number {
  return Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id)
}

/** A waiting profile as a PendingAccount: no email until `pending_accounts()` exists. */
export function toPendingAccount(profile: Profile): PendingAccount {
  const { id, username, display_name, phone, created_at } = profile
  return { id, username, display_name, phone, created_at, email: null, email_confirmed: null }
}

/** Add students' account option: "Mei Ling · meiling" (AdminAddStudents.dc.html). */
export function accountOptionLabel(account: Pick<Profile, 'display_name' | 'username'>): string {
  return `${account.display_name} · ${account.username}`
}

/**
 * Whose account a group is in, as the coach's screens write it: "Own account" when the group
 * is the account holder alone (Wei Jie's group in Wei Jie's account), otherwise "Farah’s
 * account" (AdminStudents.dc.html; Add booking; Record payment's subtitle). Names match when
 * they are the same after trimming, ignoring case. An unknown account name gives "".
 */
export function accountLabel(accountName: string, groupNames: string): string {
  const name = accountName.trim()
  if (name === '') return ''
  const own = name.toLocaleLowerCase('en') === groupNames.trim().toLocaleLowerCase('en')
  return own ? 'Own account' : `${possessive(name)} account`
}
