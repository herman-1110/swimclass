import type { CustomerAccount } from '@/entities/account'
import { type BalanceBucket, balanceBucket, type GroupBalance } from '@/entities/balance'
import { byNames, type Group } from '@/entities/group'
import { toMyt } from '@/shared/lib/time'

/** A group in Needs attention, with its balance. */
export type AttentionGroup = { group: Group; balance: GroupBalance }

/**
 * Needs attention's groups (DESIGN §4; the Schedule spec §3.6, §9 C2-C3), as the database
 * flags them (group_balance, sorted by the balance entity's buckets): those that owe for
 * their package, by name, then those on their last paid lesson, by that lesson's date.
 * Waiting accounts come after both.
 */
export function attentionGroups(
  balances: readonly GroupBalance[],
  groups: readonly Group[],
): { unpaid: AttentionGroup[]; lastLesson: AttentionGroup[] } {
  const byId = new Map(groups.map((group) => [group.group_id, group]))
  const rows = balances.flatMap((balance) => {
    const group = byId.get(balance.group_id)
    return group ? [{ group, balance }] : []
  })
  const inBucket = (bucket: BalanceBucket) =>
    rows.filter((row) => balanceBucket(row.balance, row.group.active) === bucket)
  const when = (row: AttentionGroup) =>
    row.balance.last_lesson_at === null ? 0 : toMyt(row.balance.last_lesson_at).getTime()
  return {
    unpaid: inBucket('unpaid').toSorted((a, b) => byNames(a.group, b.group)),
    lastLesson: inBucket('last-lesson').toSorted(
      (a, b) => when(a) - when(b) || byNames(a.group, b.group),
    ),
  }
}

/**
 * Approved customer accounts with no group at all, by name (Herman, 2 Oct 2026; triage
 * question 4): they can open Book but can't book until the coach adds their students, so
 * Needs attention tells him, with "Add students". Accounts whose groups are all paused are
 * left out: the coach paused them.
 */
export function accountsWithoutGroups<A extends Pick<CustomerAccount, 'id'>>(
  accounts: readonly A[],
  groups: readonly Pick<Group, 'account_id'>[],
): A[] {
  const withGroups = new Set(groups.map((group) => group.account_id))
  return accounts.filter((account) => !withGroups.has(account.id))
}
