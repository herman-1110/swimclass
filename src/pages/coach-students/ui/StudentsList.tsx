import { useRef } from 'react'

import type { PendingAccount } from '@/entities/account'
import type { ReadFailure } from '@/shared/lib/hooks/useReadFailure'
import type { Instant } from '@/shared/lib/time'
import { Banner } from '@/shared/ui/Banner'
import { Tabs } from '@/shared/ui/Tabs'

import { readFilter } from '../model/params'
import { filterCounts, inFilter, type PackageRow, type StudentsFilter } from '../model/rows'
import { PackagesList } from './PackagesList'
import { FILTER_TABS_ID } from './rowFocus'
import { StudentsLoading } from './StudentsLoading'
import { WaitingList } from './WaitingList'

type StudentsListProps = {
  /** Every row that matches the search; null while loading. */
  rows: readonly PackageRow[] | null
  /** The search matches no package at all (not just none under this tab). */
  noMatch: boolean
  /** The waiting accounts that match the search (null while loading), or the read's failure. */
  waiting: { accounts: readonly PendingAccount[] | null; failure: ReadFailure | null }
  filter: StudentsFilter
  onFilter: (filter: StudentsFilter) => void
  query: string
  onClearSearch: () => void
  showAll: boolean
  onShowAll: () => void
  highlighted: ReadonlySet<string>
  /** Rows a collapsed list still shows: the highlighted ones and the row focus goes back to. */
  onScreen: ReadonlySet<string>
  now: Instant
  /** The page's notice ("3 students added", "Siti Rahman approved"), or null. */
  notice: string | null
  onNotice: (notice: string) => void
  onRecordPayment: (groupId: string) => void
  onHistory: (groupId: string) => void
}

/**
 * The filter tabs and what they show (AdminStudents.dc.html:93-267): the packages, or the
 * accounts waiting for approval (coach-students C1). A notice after an action sits above the
 * tabs, in a polite live region that is always there.
 */
export function StudentsList(props: StudentsListProps) {
  const { rows, waiting, filter, query, now } = props
  const counts = rows ? filterCounts(rows) : null
  // Focus goes to the notice when the last waiting account has been approved.
  const noticeRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex flex-col gap-3">
      {/* Takes no room while empty, but stays in place so a new notice is read out. */}
      <div role="status" className="empty:-mb-3">
        {props.notice && (
          <Banner ref={noticeRef} tabIndex={-1}>
            {props.notice}
          </Banner>
        )}
      </div>
      <div id={FILTER_TABS_ID}>
        <Tabs
          label="Filter packages"
          items={[
            { value: 'all', label: 'All', count: counts?.all },
            { value: 'unpaid', label: 'Unpaid', count: counts?.unpaid },
            { value: 'last-lesson', label: 'Last lesson', count: counts?.['last-lesson'] },
            { value: 'paid', label: 'Paid', count: counts?.paid },
            { value: 'waiting', label: 'Waiting for approval', count: waiting.accounts?.length },
          ]}
          value={filter}
          onChange={(value) => props.onFilter(readFilter(value))}
          note="One row per package · needs action first"
        />
      </div>
      {filter === 'waiting' ? (
        <WaitingList
          accounts={waiting.accounts}
          failure={waiting.failure}
          query={query}
          onClearSearch={props.onClearSearch}
          now={now}
          onNotice={props.onNotice}
          onEmptied={() => noticeRef.current?.focus()}
        />
      ) : rows ? (
        <PackagesList
          rows={rows.filter((row) => inFilter(row, filter))}
          filter={filter}
          query={query}
          noMatch={props.noMatch}
          showAll={props.showAll}
          onShowAll={props.onShowAll}
          onClearSearch={props.onClearSearch}
          highlighted={props.highlighted}
          onScreen={props.onScreen}
          now={now}
          onRecordPayment={props.onRecordPayment}
          onHistory={props.onHistory}
        />
      ) : (
        <StudentsLoading />
      )}
    </div>
  )
}
