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
