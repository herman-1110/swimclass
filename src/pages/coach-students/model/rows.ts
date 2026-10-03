import type { PendingAccount } from '@/entities/account'
import { type BalanceBucket, balanceBucket, type GroupBalance } from '@/entities/balance'
import type { Group } from '@/entities/group'
import { plural } from '@/shared/lib/format'

// The Students & payments list (coach-students §5.2): one row per group package, needs
// action first. Display only: the database decides every flag (unpaid, last lesson).

/** One group's package: the group, its balance and the account holder's name ("Farah"). */
export type PackageRow = {
  group: Group
  balance: GroupBalance
  accountName: string
  bucket: BalanceBucket
}

/** The filter tabs. Waiting for approval lists accounts, not packages. */
export type StudentsFilter = 'all' | 'unpaid' | 'last-lesson' | 'paid' | 'waiting'
export type PackageFilter = Exclude<StudentsFilter, 'waiting'>

const collator = new Intl.Collator('en', { sensitivity: 'base' })
const BUCKETS: Record<BalanceBucket, number> = { unpaid: 0, 'last-lesson': 1, paid: 2 }

/**
 * Needs action first (prompt 09: unpaid, then last lesson, then the rest by name): active
 * groups before paused ones (coach-students Q7), then the bucket, the names as people read
 * them, the account holder's name and the id.
 */
export function compareRows(a: PackageRow, b: PackageRow): number {
  return (
    Number(!a.group.active) - Number(!b.group.active) ||
    BUCKETS[a.bucket] - BUCKETS[b.bucket] ||
    collator.compare(a.group.display_names, b.group.display_names) ||
    collator.compare(a.accountName, b.accountName) ||
    a.group.group_id.localeCompare(b.group.group_id)
  )
}

/** Every group with its balance and account holder, in the list's order. */
export function packageRows(
  groups: readonly Group[],
  balances: readonly GroupBalance[],
  accountNames: ReadonlyMap<string, string>,
): PackageRow[] {
  const byGroup = new Map(balances.map((balance) => [balance.group_id, balance]))
  return groups
    .flatMap((group) => {
      const balance = byGroup.get(group.group_id)
      if (!balance) return []
      const accountName = accountNames.get(group.account_id) ?? ''
      return [{ group, balance, accountName, bucket: balanceBucket(balance, group.active) }]
    })
    .sort(compareRows)
}

/** Text as a search compares it: no accents, any case, single spaces. */
function searchable(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The search box's text, ready to compare ("" matches everything). */
export function searchKey(query: string): string {
  return searchable(query)
}

/** A row matches when a student's name or the account holder's name contains the text. */
export function rowMatches(row: PackageRow, key: string): boolean {
  if (key === '') return true
  return (
    searchable(row.group.display_names).includes(key) || searchable(row.accountName).includes(key)
  )
}

/** A waiting account matches by its name. */
export function accountMatches(
  account: Pick<PendingAccount, 'display_name'>,
  key: string,
): boolean {
  return key === '' || searchable(account.display_name).includes(key)
}

/** Whether a row is under a tab: Paid counts every row that isn't unpaid ("Paid 11"). */
export function inFilter(row: PackageRow, filter: PackageFilter): boolean {
  if (filter === 'unpaid') return row.bucket === 'unpaid'
  if (filter === 'last-lesson') return row.bucket === 'last-lesson'
  if (filter === 'paid') return row.bucket !== 'unpaid'
  return true
}

/** Each tab's count: the rows it would show (after the search). */
export function filterCounts(rows: readonly PackageRow[]): Record<PackageFilter, number> {
  const count = (filter: PackageFilter) => rows.filter((row) => inFilter(row, filter)).length
  return {
    all: rows.length,
    unpaid: count('unpaid'),
    'last-lesson': count('last-lesson'),
    paid: count('paid'),
  }
}

/** Names in a figure: "Hana, Wei Jie", and after three "Hana, Wei Jie, Priya and 2 more". */
export function figureNames(names: readonly string[]): string {
  const shown = names.slice(0, 3).join(', ')
  const more = names.length - 3
  return more > 0 ? `${shown} and ${more} more` : shown
}

export type StudentsFigure = { count: number; caption: string }

function namedFigure(label: string, rows: readonly PackageRow[]): StudentsFigure {
  const names = rows.map((row) => row.group.display_names)
  return {
    count: rows.length,
    caption: names.length === 0 ? label : `${label} · ${figureNames(names)}`,
  }
}

/**
 * The three figures (coach-students §5.2.7), whatever the search and filter: "2" "Unpaid ·
 * Hana, Wei Jie"; "2" "On last lesson · Priya, Sofia"; "15" "Students · 13 packages" (the
 * different students of the active groups, and those groups).
 */
export function studentsFigures(rows: readonly PackageRow[]): {
  unpaid: StudentsFigure
  lastLesson: StudentsFigure
  students: StudentsFigure
} {
  const active = rows.filter((row) => row.group.active)
  const students = new Set(active.flatMap((row) => row.group.student_ids)).size
  return {
    unpaid: namedFigure(
      'Unpaid',
      rows.filter((row) => row.bucket === 'unpaid'),
    ),
    lastLesson: namedFigure(
      'On last lesson',
      rows.filter((row) => row.bucket === 'last-lesson'),
    ),
    students: {
      count: students,
      caption: `${students === 1 ? 'Student' : 'Students'} · ${plural(active.length, 'package')}`,
    },
  }
}

/** How many cards and table rows show before "Show all" (both drawings, with the seed). */
export const COLLAPSED_CARDS = 5
export const COLLAPSED_TABLE_ROWS = 9

/**
 * How many rows a collapsed list shows (coach-students §5.2.6): every row that needs action
 * (unpaid or on its last lesson), then more until there are at least `minimum`.
 */
export function collapsedCount(
  rows: readonly Pick<PackageRow, 'bucket'>[],
  minimum: number,
): number {
  const needsAction = rows.findLastIndex((row) => row.bucket !== 'paid') + 1
  return Math.min(rows.length, Math.max(minimum, needsAction))
}

/** The footer: "Needs action first · 13 packages". */
export function footerCaption(count: number): string {
  return `Needs action first · ${plural(count, 'package')}`
}
