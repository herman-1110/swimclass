import { useRef } from 'react'

import { DocumentTitle } from '@/entities/settings'

import { studentsFigures } from './model/rows'
import { useStudentsPage } from './model/useStudentsPage'
import { HistoryDrawer } from './ui/HistoryDrawer'
import { LoadError } from './ui/LoadError'
import { PaymentPanel } from './ui/PaymentPanel'
import { StudentsFigures } from './ui/StudentsFigures'
import { StudentsHeader } from './ui/StudentsHeader'
import { StudentsList } from './ui/StudentsList'

/**
 * Students & payments (`/coach/students`; coach-students spec, AdminStudents.dc.html): every
 * group's package, needs action first, with the Record payment panel beside it from 1280 px,
 * History in a drawer, and the accounts waiting for approval.
 */
export function CoachStudentsPage() {
  const searchRef = useRef<HTMLInputElement>(null)
  const panelTitle = useRef<HTMLHeadingElement>(null)
  const page = useStudentsPage({ search: searchRef, panelTitle })
  const { url, data, view, now, loading } = page

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <DocumentTitle page="Students & payments" />
      {/* Padded as drawn (24/20/32, 32, 32/32/28): the panel beside it runs to the edges. */}
      <div className="flex min-w-0 flex-1 flex-col gap-5 px-5 pt-6 pb-8 md:p-8 xl:pb-7">
        <StudentsHeader query={page.query} onQuery={page.search} searchRef={searchRef} />
        {data.failure ? (
          <LoadError failure={data.failure} />
        ) : (
          <div aria-busy={loading || undefined} className="flex flex-col gap-5">
            {loading && (
              <p role="status" className="sr-only">
                Loading students and payments
              </p>
            )}
            <StudentsFigures figures={data.rows ? studentsFigures(data.rows) : null} />
            <StudentsList
              rows={view.matching}
              noMatch={view.noMatch}
              waiting={{ accounts: view.waitingAccounts, failure: data.waitingFailure }}
              filter={url.filter}
              onFilter={page.setFilter}
              query={page.query}
              onClearSearch={page.clearSearch}
              showAll={page.showAll}
              onShowAll={page.showEveryRow}
              highlighted={view.highlighted}
              onScreen={view.onScreen}
              now={now}
              notice={page.notice}
              onNotice={page.setNotice}
              onRecordPayment={page.recordPayment}
              onHistory={page.openHistory}
            />
          </div>
        )}
        <p aria-live="polite" className="sr-only">
          {page.announcement}
        </p>
      </div>
      <PaymentPanel
        row={view.panelRow}
        loading={loading}
        settings={data.settings}
        open={url.pay !== null && url.history === null && (loading || view.payRow !== null)}
        wide={page.wide}
        now={now}
        onClose={url.closePay}
        onEngage={page.engage}
        titleRef={panelTitle}
      />
      <HistoryDrawer
        row={view.historyRow}
        onClose={url.closeHistory}
        onRecordPayment={(groupId) => page.recordPayment(groupId, true)}
        now={now}
      />
    </div>
  )
}
