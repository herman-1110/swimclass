import { possessive } from '@/shared/lib/format'

// The approval words (the Students spec §5.3 W6 and W7, proposed).

/** The notice after Approve: "Siti Rahman approved." (a sentence, like every notice). */
export function approvedNotice(name: string): string {
  return `${name} approved.`
}

/** The confirmation's title: "Remove Siti Rahman’s sign-up?". */
export function removeTitle(name: string): string {
  return `Remove ${possessive(name)} sign-up?`
}

/** What removing does: "This deletes the account siti. They can sign up again." */
export function removeDescription(username: string): string {
  return `This deletes the account ${username}. They can sign up again.`
}

/** The notice after a sign-up is removed. */
export const SIGN_UP_REMOVED = 'Sign-up removed.'
