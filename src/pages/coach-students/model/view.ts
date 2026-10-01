import type { PendingAccount } from '@/entities/account'

import {
  accountMatches,
  inFilter,
  type PackageRow,
  rowMatches,
  searchKey,
  type StudentsFilter,
} from './rows'

type ViewInput = {
  /** Every row, or null while loading. */
  rows: readonly PackageRow[] | null
  /** The accounts waiting for approval, or null while loading. */
  waiting: readonly PendingAccount[] | null
  query: string
  filter: StudentsFilter
  /** The URL's group ids. */
  pay: string | null
  history: string | null
  added: string | null
  /** From 1280 px the payment panel is a column that always shows a group. */
  wide: boolean
}

const byId = (rows: readonly PackageRow[] | null, id: string | null) =>
  id === null ? null : (rows?.find((row) => row.group.group_id === id) ?? null)

/**
 * What the page shows for its URL and search (coach-students §1, §2.4, §5.2):
 * - `matching`: the rows that match the search (the tabs count these);
 * - `listed`: those under the chosen tab (none on Waiting for approval);
 * - `payRow`, `historyRow`, `addedRow`: the URL's groups, null when unknown;
 * - `panelRow`: the payment panel's group: `pay`, or from 1280 px the first listed row (as
 *   drawn, where Hana is in the panel);
 * - `highlighted`: the rows on --accent-soft: the panel's group (below 1280 px only while the
 *   panel is open) and a group just added;
 * - `waitingAccounts`: the waiting accounts that match the search.
 */
export function studentsView(input: ViewInput) {
  const { rows, filter, wide } = input
  const key = searchKey(input.query)
  const matching = rows?.filter((row) => rowMatches(row, key)) ?? null
  const listed = filter === 'waiting' ? [] : (matching ?? []).filter((row) => inFilter(row, filter))
  const payRow = byId(rows, input.pay)
  const historyRow = byId(rows, input.history)
  const addedRow = byId(rows, input.added)
  const panelRow = payRow ?? (wide ? (listed.at(0) ?? null) : null)
  const highlighted = new Set(
    [wide ? panelRow : payRow, addedRow].flatMap((row) => (row ? [row.group.group_id] : [])),
  )
  const waitingAccounts = input.waiting?.filter((account) => accountMatches(account, key)) ?? null
  return { matching, listed, payRow, historyRow, addedRow, panelRow, highlighted, waitingAccounts }
}
