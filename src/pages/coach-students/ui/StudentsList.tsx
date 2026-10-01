import type { PendingAccount } from '@/entities/account'
import type { Instant } from '@/shared/lib/time'
import { Banner } from '@/shared/ui/Banner'
import { Tabs } from '@/shared/ui/Tabs'

import { readFilter } from '../model/params'
import { filterCounts, inFilter, type PackageRow, type StudentsFilter } from '../model/rows'
import { PackagesList } from './PackagesList'
import { StudentsLoading } from './StudentsLoading'
import { WaitingList } from './WaitingList'

type StudentsListProps = {
  /** Every row that matches the search; null while loading. */
  rows: readonly PackageRow[] | null
  /** The waiting accounts that match the search (null while loading), or the read's failure. */
  waiting: { accounts: readonly PendingAccount[] | null; error: unknown; retry: () => void }
  filter: StudentsFilter
  onFilter: (filter: StudentsFilter) => void
  query: string
  onClearSearch: () => void
  showAll: boolean
  onShowAll: () => void
  highlighted: ReadonlySet<string>
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

  return (
    <div className="flex flex-col gap-3">
      {/* Takes no room while empty, but stays in place so a new notice is read out. */}
      <div role="status" className="empty:-mb-3">
        {props.notice && <Banner>{props.notice}</Banner>}
      </div>
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
      {filter === 'waiting' ? (
        <WaitingList
          accounts={waiting.accounts}
          error={waiting.error}
          onRetry={waiting.retry}
          query={query}
          onClearSearch={props.onClearSearch}
          now={now}
          onNotice={props.onNotice}
        />
      ) : rows ? (
        <PackagesList
          rows={rows.filter((row) => inFilter(row, filter))}
          filter={filter}
          query={query}
          showAll={props.showAll}
          onShowAll={props.onShowAll}
          onClearSearch={props.onClearSearch}
          highlighted={props.highlighted}
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
