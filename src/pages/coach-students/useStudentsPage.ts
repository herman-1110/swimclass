import { type RefObject, useEffect, useRef, useState } from 'react'

import { useDebouncedValue } from '@/shared/lib/hooks/useDebouncedValue'
import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery'
import { useNow } from '@/shared/lib/hooks/useNow'

import { listAnnouncement, studentsAdded } from './model/copy'
import type { StudentsFilter } from './model/rows'
import { useStaleParams } from './model/useStaleParams'
import { useStudentsData } from './model/useStudentsData'
import { useStudentsUrl } from './model/useStudentsUrl'
import { studentsView } from './model/view'
import { scrollToRow } from './ui/scrollToRow'

type PageRefs = {
  /** The search box: "Clear search" puts focus back there. */
  search: RefObject<HTMLInputElement | null>
  /** The payment panel's title: from 1280 px "Record payment" moves focus there. */
  panelTitle: RefObject<HTMLHeadingElement | null>
}

/**
 * Everything Students & payments shows and does, for CoachStudentsPage to lay out: the
 * reads, the address, the search, the notices and where focus goes.
 */
export function useStudentsPage(refs: PageRefs) {
  const now = useNow()
  // Behaviour CSS can't change: from 1280 px the payment panel is a column beside the list.
  const wide = useMediaQuery('(min-width: 1280px)')
  const url = useStudentsUrl(wide)
  const data = useStudentsData()
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [added] = useState(url.added)
  const [shownAllFor, setShownAllFor] = useState<StudentsFilter | null>(null)
  const [changed, setChanged] = useState(false)
  // From 1280 px, the group whose "Record payment" was pressed: the panel's title takes focus
  // once the address shows that group (a later render than the press).
  const focusPanelFor = useRef<string | null>(null)
  const [panelFocus, setPanelFocus] = useState(0)

  const { rows } = data
  const loaded = rows !== null
  const view = studentsView({
    ...url,
    rows,
    waiting: data.waiting.data ?? null,
    query,
    added,
    wide,
  })
  useStaleParams({
    ...url,
    payFound: loaded ? view.payRow !== null : null,
    historyFound: loaded ? view.historyRow !== null : null,
  })

  const count = url.filter === 'waiting' ? view.waitingAccounts?.length : view.listed.length
  const announcement = useDebouncedValue(
    changed && loaded && count !== undefined ? listAnnouncement(url.filter, count) : '',
    500,
  )

  // From 1280 px "Record payment" moves focus to the panel beside the list, once the panel
  // shows the group and History has closed (until then the History drawer keeps focus, and
  // on closing gives it back to the button that opened it).
  useEffect(() => {
    const groupId = focusPanelFor.current
    if (groupId === null || url.pay !== groupId || url.history !== null) return
    focusPanelFor.current = null
    refs.panelTitle.current?.focus()
  }, [panelFocus, url.pay, url.history, refs.panelTitle])
  // A group just added shows on screen once the list is in.
  const addedShown = view.addedRow !== null
  useEffect(() => {
    if (addedShown && added) scrollToRow(added)
  }, [addedShown, added])

  const recordPayment = (groupId: string, fromHistory = false) => {
    if (fromHistory) url.historyToPay(groupId)
    else url.openPay(groupId)
    if (wide) {
      focusPanelFor.current = groupId
      // Runs the focus effect even when the panel already shows this group.
      setPanelFocus((request) => request + 1)
    }
  }

  return {
    now,
    wide,
    url,
    data,
    loading: !loaded && data.error === null,
    view,
    query,
    announcement,
    notice: notice ?? (view.addedRow ? studentsAdded(view.addedRow.group.size) : null),
    showAll: shownAllFor === url.filter,
    search: (text: string) => {
      setQuery(text)
      setChanged(true)
    },
    setFilter: (filter: StudentsFilter) => {
      url.setFilter(filter)
      setChanged(true)
      // "Show all" lasts until the tab changes (coach-students §5.2.6): back on this tab,
      // the list is collapsed again.
      if (filter !== url.filter) setShownAllFor(null)
    },
    clearSearch: () => {
      setQuery('')
      refs.search.current?.focus()
    },
    showEveryRow: () => setShownAllFor(url.filter),
    setNotice,
    recordPayment,
    /** The coach worked on the panel's group: from 1280 px it then stays there. */
    engage: (groupId: string) => {
      if (wide && url.pay !== groupId) url.pinPay(groupId)
    },
  }
}
