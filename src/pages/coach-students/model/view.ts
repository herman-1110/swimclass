import type { PendingAccount } from '@/entities/account'

import {
  accountMatches,
  inFilter,
  type PackageRow,
  rowMatches,
  searchKey,
  type StudentsFilter,
} from './rows'

type TabInput = {
  /** Every row, or null while loading. */
  rows: readonly PackageRow[] | null
  /** The accounts waiting for approval, or null while loading. */
  waiting: readonly PendingAccount[] | null
  query: string
  filter: StudentsFilter
}

type ViewInput = TabInput & {
  /** The URL's group ids. */
  pay: string | null
  history: string | null
  added: string | null
  /** The group whose row opened the payment panel or History, kept on screen after they close. */
  kept: string | null
  /** From 1280 px the payment panel is a column that always shows a group. */
  wide: boolean
}

const byId = (rows: readonly PackageRow[] | null, id: string | null) =>
  id === null ? null : (rows?.find((row) => row.group.group_id === id) ?? null)

/**
 * What a tab shows for a search (coach-students §5.2.2):
 * - `searching`: there is search text;
 * - `matching`: the rows that match the search, under any tab (the tabs count these);
 * - `listed`: those under the tab (none on Waiting for approval);
 * - `noMatch`: a search that matches no package at all, so the empty list says so (a search
 *   that only misses this tab gets the tab's own empty words);
 * - `waitingAccounts`: the waiting accounts that match the search.
 */
export function tabView({ rows, waiting, query, filter }: TabInput) {
  const key = searchKey(query)
  const searching = key !== ''
  const matching = rows?.filter((row) => rowMatches(row, key)) ?? null
  const listed = filter === 'waiting' ? [] : (matching ?? []).filter((row) => inFilter(row, filter))
  const noMatch = searching && matching?.length === 0
  const waitingAccounts = waiting?.filter((account) => accountMatches(account, key)) ?? null
  return { searching, matching, listed, noMatch, waitingAccounts }
}

/**
 * What the page shows for its URL and search (coach-students §1, §2.4, §5.2): `tabView`, plus
 * - `payRow`, `historyRow`, `addedRow`: the URL's groups, null when unknown;
 * - `panelRow`: the payment panel's group: `pay`, or from 1280 px the first listed row (as
 *   drawn, where Hana is in the panel);
 * - `highlighted`: the rows on --accent-soft: the panel's group (below 1280 px only while the
 *   panel is open) and a group just added;
 * - `onScreen`: the rows a collapsed list must still show: the highlighted ones and the kept
 *   one (so focus can go back to its button after a payment moved it down).
 */
export function studentsView(input: ViewInput) {
  const { rows, wide } = input
  const tab = tabView(input)
  const payRow = byId(rows, input.pay)
  const historyRow = byId(rows, input.history)
  const addedRow = byId(rows, input.added)
  const panelRow = payRow ?? (wide ? (tab.listed.at(0) ?? null) : null)
  const highlighted = new Set(
    [wide ? panelRow : payRow, addedRow].flatMap((row) => (row ? [row.group.group_id] : [])),
  )
  const onScreen = new Set([...highlighted, ...(input.kept === null ? [] : [input.kept])])
  return { ...tab, payRow, historyRow, addedRow, panelRow, highlighted, onScreen }
}
