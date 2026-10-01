import { useEffect, useRef } from 'react'

import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery'
import type { Instant } from '@/shared/lib/time'
import { Button } from '@/shared/ui/Button'
import { EmptyState } from '@/shared/ui/EmptyState'

import { EMPTY_TAB, NO_STUDENTS_YET, noMatchText } from '../model/copy'
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
import { focusInView, rowActionId } from './rowFocus'

type PackagesListProps = {
  /** The rows under the tab and the search, in order. */
  rows: readonly PackageRow[]
  filter: PackageFilter
  /** The search as typed; a search shows every match. */
  query: string
  /** The search matches no package under any tab. */
  noMatch: boolean
  showAll: boolean
  onShowAll: () => void
  onClearSearch: () => void
  highlighted: ReadonlySet<string>
  /** Rows a collapsed list still shows (the highlighted ones, the row focus goes back to). */
  onScreen: ReadonlySet<string>
  now: Instant
  onRecordPayment: (groupId: string) => void
  onHistory: (groupId: string) => void
}

/**
 * The packages under a tab (coach-students §5.2.6): needs action first, collapsed to at
 * least 5 cards or 9 table rows until "Show all" (or a search, or a row that must stay on
 * screen further down), then the footer. With no rows it says why: a search that matches
 * nothing at all, or a tab with none (coach-students §6).
 */
export function PackagesList(props: PackagesListProps) {
  const { rows, filter, query, noMatch, showAll, onShowAll, onClearSearch, onScreen } = props
  const tablet = useMediaQuery('(min-width: 768px)')
  const searching = query.trim() !== ''
  // Where focus goes after "Show all" (the first row it shows), once that row is in. It moves
  // to the middle of the window, so the tab bar can't cover it and the new rows show below.
  const focusAfterShowAll = useRef<string | null>(null)
  useEffect(() => {
    const id = focusAfterShowAll.current
    if (!showAll || id === null) return
    focusAfterShowAll.current = null
    const action = document.getElementById(id)
    if (action) focusInView(action, 'center')
  }, [showAll])

  if (rows.length === 0) {
    const clearSearch = searching ? (
      <Button variant="link" flush onClick={onClearSearch}>
        Clear search
      </Button>
    ) : undefined
    if (noMatch) return <EmptyState action={clearSearch}>{noMatchText(filter, query)}</EmptyState>
    if (filter === 'all') {
      return (
        <EmptyState title={NO_STUDENTS_YET}>Add students to create their first package.</EmptyState>
      )
    }
    // The search matches packages under other tabs only: the counts beside the tabs show where.
    return <EmptyState action={clearSearch}>{EMPTY_TAB[filter]}</EmptyState>
  }

  const last = rows.reduce((at, row, index) => (onScreen.has(row.group.group_id) ? index : at), -1)
  const shown = (minimum: number) =>
    showAll || searching ? rows.length : Math.max(collapsedCount(rows, minimum), last + 1)
  const cards = shown(COLLAPSED_CARDS)
  const tableRows = shown(COLLAPSED_TABLE_ROWS)
  const showEveryRow = () => {
    const first = tablet ? rows.at(tableRows) : rows.at(cards)
    focusAfterShowAll.current = first
      ? rowActionId(tablet ? 'table' : 'card', first.group.group_id)
      : null
    onShowAll()
  }

  const each = {
    highlighted: props.highlighted,
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
