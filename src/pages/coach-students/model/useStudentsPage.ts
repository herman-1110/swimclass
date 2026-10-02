import { type RefObject, useEffect, useRef, useState } from 'react'

import { useDebouncedValue } from '@/shared/lib/hooks/useDebouncedValue'
import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery'
import { useNow } from '@/shared/lib/hooks/useNow'

import { returnFocusToRow, scrollToRow } from '../ui/rowFocus'
import { listAnnouncement, studentsAdded } from './copy'
import type { StudentsFilter } from './rows'
import { useStaleParams } from './useStaleParams'
import { useStudentsData } from './useStudentsData'
import { useStudentsUrl } from './useStudentsUrl'
import { studentsView, tabView } from './view'

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
  // The group Add students just added, and whom its invite went to: kept from the first
  // render, as `?added` and its router state go once shown (useStaleParams).
  const [added] = useState(url.added)
  const [invitedEmail] = useState(url.invitedEmail)
  const [shownAllFor, setShownAllFor] = useState<StudentsFilter | null>(null)
  // The group whose row opened the payment panel or History. Its row stays on screen after
  // they close (until the tab or the search changes), so focus can go back to its button even
  // when a payment moved the row past the collapse (coach-students §7).
  const [kept, setKept] = useState<string | null>(null)
  // What the live region says after the latest tab or search change, and how many changes
  // there have been.
  const [announced, setAnnounced] = useState({ text: '', change: 0 })
  const settled = useDebouncedValue(announced, 500)
  // From 1280 px, the group whose "Record payment" was pressed: the panel's title takes focus
  // once the address shows that group (a later render than the press).
  // Arriving with ?pay (the coach Schedule's "Record payment for …") counts as a press.
  const focusPanelFor = useRef<string | null>(
    wide && url.pay !== null && url.history === null ? url.pay : null,
  )
  const [panelFocus, setPanelFocus] = useState(0)

  const { rows } = data
  const loaded = rows !== null
  const waiting = data.waiting.data ?? null
  const view = studentsView({ ...url, rows, waiting, query, added, kept, wide })
  useStaleParams({
    ...url,
    payFound: loaded ? view.payRow !== null : null,
    historyFound: loaded ? view.historyRow !== null : null,
  })

  // After a tab or search change, the polite region says what the list now shows
  // (coach-students §7), once typing has stopped. Changes in the data (a payment, an approval)
  // aren't announced here: their own notices say what happened.
  const announce = (filter: StudentsFilter, text: string) => {
    const tab = tabView({ rows, waiting, query: text, filter })
    const count = filter === 'waiting' ? tab.waitingAccounts?.length : tab.listed.length
    const noMatch = filter === 'waiting' ? tab.searching : tab.noMatch
    setAnnounced(({ change }) => ({
      text: loaded && count !== undefined ? listAnnouncement(filter, count, noMatch) : '',
      change: change + 1,
    }))
  }
  // Empty while a change is settling, so the same words are read out again on the next tab.
  const announcement = settled.change === announced.change ? settled.text : ''

  // From 1280 px "Record payment" moves focus to the panel beside the list, once the panel
  // shows the group and History has closed (until then the History drawer keeps focus, and
  // on closing gives it back to the button that opened it).
  useEffect(() => {
    const groupId = focusPanelFor.current
    const title = refs.panelTitle.current
    if (groupId === null || url.pay !== groupId || url.history !== null || !title) return
    focusPanelFor.current = null
    title.focus()
  }, [panelFocus, url.pay, url.history, refs.panelTitle, loaded])
  // The payment panel (a modal below 1280 px) or History has closed: focus goes back to the
  // row's button, which `kept` keeps on screen.
  const modalOpen = url.history !== null || (!wide && url.pay !== null)
  const wasOpen = useRef(modalOpen)
  useEffect(() => {
    const closed = wasOpen.current && !modalOpen
    wasOpen.current = modalOpen
    if (closed && kept !== null) returnFocusToRow(kept)
  }, [modalOpen, kept])
  // A group just added shows on screen once the list is in.
  const addedShown = view.addedRow !== null
  useEffect(() => {
    if (addedShown && added) scrollToRow(added)
  }, [addedShown, added])

  const recordPayment = (groupId: string, fromHistory = false) => {
    setKept(groupId)
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
    loading: !loaded && data.failure === null,
    view,
    query,
    announcement,
    notice:
      notice ?? (view.addedRow ? studentsAdded(view.addedRow.group.size, invitedEmail) : null),
    showAll: shownAllFor === url.filter,
    search: (text: string) => {
      setQuery(text)
      setKept(null)
      announce(url.filter, text)
    },
    setFilter: (filter: StudentsFilter) => {
      if (filter === url.filter) return
      url.setFilter(filter)
      announce(filter, query)
      // "Show all" lasts until the tab changes (coach-students §5.2.6): back on this tab,
      // the list is collapsed again.
      setShownAllFor(null)
      setKept(null)
    },
    clearSearch: () => {
      setQuery('')
      setKept(null)
      announce(url.filter, '')
      refs.search.current?.focus()
    },
    showEveryRow: () => setShownAllFor(url.filter),
    setNotice,
    recordPayment,
    openHistory: (groupId: string) => {
      setKept(groupId)
      url.openHistory(groupId)
    },
    /** The coach worked on the panel's group: from 1280 px it then stays there. */
    engage: (groupId: string) => {
      if (wide && url.pay !== groupId) url.pinPay(groupId)
    },
  }
}
