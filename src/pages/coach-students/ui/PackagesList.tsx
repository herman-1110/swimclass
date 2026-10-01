import { useEffect, useRef } from 'react'

import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery'
import type { Instant } from '@/shared/lib/time'
import { Button } from '@/shared/ui/Button'
import { EmptyState } from '@/shared/ui/EmptyState'

import {
  COLLAPSED_CARDS,
  COLLAPSED_TABLE_ROWS,
  collapsedCount,
  type PackageFilter,
  type PackageRow,
} from '../model/rows'
import { PackageCards } from './PackageCards'
import { PackagesFooter } from './PackagesFooter'
import { PackagesTable } from './PackagesTable'

// What a tab with nothing to show says (coach-students §6, proposed).
const EMPTY: Record<Exclude<PackageFilter, 'all'>, string> = {
  unpaid: 'No unpaid packages.',
  'last-lesson': 'No one is on their last lesson.',
  paid: 'No paid packages.',
}

type PackagesListProps = {
  /** The rows under the tab and the search, in order. */
  rows: readonly PackageRow[]
  filter: PackageFilter
  /** The search as typed; a search shows every match. */
  query: string
  showAll: boolean
  onShowAll: () => void
  onClearSearch: () => void
  highlighted: ReadonlySet<string>
  now: Instant
  onRecordPayment: (groupId: string) => void
  onHistory: (groupId: string) => void
}

/**
 * The packages under a tab (coach-students §5.2.6): needs action first, collapsed to at
 * least 5 cards or 9 table rows until "Show all" (or a search, or a highlighted row further
 * down), then the footer. With no rows it says why.
 */
export function PackagesList(props: PackagesListProps) {
  const { rows, filter, query, showAll, onShowAll, onClearSearch, highlighted } = props
  const tablet = useMediaQuery('(min-width: 768px)')
  const searching = query.trim() !== ''
  // Where focus goes after "Show all" (the first row it shows), once that row is in.
  const focusAfterShowAll = useRef<string | null>(null)
  useEffect(() => {
    if (!showAll || !focusAfterShowAll.current) return
    document.getElementById(focusAfterShowAll.current)?.focus()
    focusAfterShowAll.current = null
  }, [showAll])

  if (rows.length === 0) {
    if (searching) {
      return (
        <EmptyState
          action={
            <Button variant="link" flush onClick={onClearSearch}>
              Clear search
            </Button>
          }
        >
          {`No students match “${query.trim()}”.`}
        </EmptyState>
      )
    }
    if (filter === 'all') {
      return (
        <EmptyState title="No students yet">Add students to create their first package.</EmptyState>
      )
    }
    return <EmptyState>{EMPTY[filter]}</EmptyState>
  }

  const last = rows.reduce(
    (at, row, index) => (highlighted.has(row.group.group_id) ? index : at),
    -1,
  )
  const shown = (minimum: number) =>
    showAll || searching ? rows.length : Math.max(collapsedCount(rows, minimum), last + 1)
  const cards = shown(COLLAPSED_CARDS)
  const tableRows = shown(COLLAPSED_TABLE_ROWS)
  const showEveryRow = () => {
    const first = tablet ? rows.at(tableRows) : rows.at(cards)
    const layout = tablet ? 'table' : 'card'
    focusAfterShowAll.current = first ? `row-action-${layout}-${first.group.group_id}` : null
    onShowAll()
  }

  const each = {
    highlighted,
    now: props.now,
    onRecordPayment: props.onRecordPayment,
    onHistory: props.onHistory,
  }
  return (
    <>
      <PackagesTable {...each} rows={rows.slice(0, tableRows)} />
      <PackageCards {...each} rows={rows.slice(0, cards)} />
      <PackagesFooter
        count={rows.length}
        hiding={{ cards: cards < rows.length, table: tableRows < rows.length }}
        onShowAll={showEveryRow}
      />
    </>
  )
}
