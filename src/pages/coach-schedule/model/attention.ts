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
    rows.filter((row) => balanceBucket(row.balance) === bucket)
  const when = (row: AttentionGroup) =>
    row.balance.last_lesson_at === null ? 0 : toMyt(row.balance.last_lesson_at).getTime()
  return {
    unpaid: inBucket('unpaid').toSorted((a, b) => byNames(a.group, b.group)),
    lastLesson: inBucket('last-lesson').toSorted(
      (a, b) => when(a) - when(b) || byNames(a.group, b.group),
    ),
  }
}
