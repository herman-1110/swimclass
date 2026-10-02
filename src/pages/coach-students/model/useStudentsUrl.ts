import { useLocation, useNavigate, useSearchParams } from 'react-router'

import { STUDENTS_PARAMS } from '@/shared/config/routes'

import { openedBy, type OpenedState, readFilter, type StudentsParam, withParams } from './params'
import type { StudentsFilter } from './rows'

type Changes = Partial<Record<StudentsParam, string | null>>

/**
 * The page's URL state (coach-students §1): the filter, the group in the payment panel
 * (`pay`) and in the History drawer (`history`), and a new group to highlight (`added`).
 *
 * Opening a modal pushes an entry, so a phone's Back closes it; Close, Esc and Cancel go back
 * when this visit pushed that entry, and otherwise remove the param. From 1280 px the panel
 * is a column, so choosing its group replaces the entry. Everything else replaces.
 */
export function useStudentsUrl(wide: boolean) {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const opened = openedBy(location.state)

  const change = (
    changes: Changes,
    { push = false, state }: { push?: boolean; state?: OpenedState | null } = {},
  ) =>
    setParams((current) => withParams(current, changes), {
      replace: !push,
      // A replaced entry keeps saying which panel it was pushed for.
      state: state === undefined ? (opened ? { opened } : null) : state,
      // The same page: keep the list where it is (ScrollRestoration would go to the top).
      preventScrollReset: true,
    })

  return {
    filter: readFilter(params.get(STUDENTS_PARAMS.filter)),
    pay: params.get(STUDENTS_PARAMS.pay),
    history: params.get(STUDENTS_PARAMS.history),
    added: params.get(STUDENTS_PARAMS.added),
    setFilter: (filter: StudentsFilter) => change({ filter: filter === 'all' ? null : filter }),
    openPay: (groupId: string) =>
      wide
        ? change({ pay: groupId })
        : change({ pay: groupId }, { push: true, state: { opened: 'pay' } }),
    closePay: () => (opened === 'pay' ? void navigate(-1) : change({ pay: null }, { state: null })),
    /** Keep a group in the 1280 px column (the panel was showing it by default). */
    pinPay: (groupId: string) => change({ pay: groupId }),
    openHistory: (groupId: string) =>
      change({ history: groupId }, { push: true, state: { opened: 'history' } }),
    closeHistory: () =>
      opened === 'history' ? void navigate(-1) : change({ history: null }, { state: null }),
    /** History's "Record payment": the drawer's entry becomes the panel's. */
    historyToPay: (groupId: string) =>
      change({ history: null, pay: groupId }, { state: opened ? { opened: 'pay' } : null }),
    /** Drops params whose group doesn't exist, or that have done their job (`added`). */
    remove: (names: readonly StudentsParam[]) =>
      change(Object.fromEntries(names.map((name) => [name, null]))),
  }
}
