import type { STUDENTS_PARAMS } from '@/shared/config/routes'

import type { StudentsFilter } from './rows'

// The page's address (coach-students §1): what is worth keeping on refresh or sharing. The
// search is not here: it is a person's name (TECH_SPEC §13).

/** The search params this page reads, named once in shared/config/routes.ts with the links
 *  into the page. */
export type StudentsParam = (typeof STUDENTS_PARAMS)[keyof typeof STUDENTS_PARAMS]

const FILTERS: readonly StudentsFilter[] = ['unpaid', 'last-lesson', 'paid', 'waiting']

/** `?filter=`: one of the tabs; anything else (or nothing) is All. */
export function readFilter(value: string | null): StudentsFilter {
  return FILTERS.find((filter) => filter === value) ?? 'all'
}

/** The params with these changes: a value sets one, null removes it. */
export function withParams(
  params: URLSearchParams,
  changes: Partial<Record<StudentsParam, string | null>>,
): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const [name, value] of Object.entries(changes)) {
    if (value === null || value === undefined) next.delete(name)
    else next.set(name, value)
  }
  return next
}

/**
 * The router state of an entry this page pushed to open the payment panel or the History
 * drawer, so closing it can go back instead of leaving an extra entry (coach-students §1).
 */
export type OpenedState = { opened: 'pay' | 'history' }

/** Which panel this entry was pushed for, if any. */
export function openedBy(state: unknown): OpenedState['opened'] | null {
  if (typeof state !== 'object' || state === null || !('opened' in state)) return null
  return state.opened === 'pay' || state.opened === 'history' ? state.opened : null
}
