import { useEffect, useEffectEvent } from 'react'

import type { StudentsParam } from './params'

type StaleParamsInput = {
  /** The address's group ids. */
  pay: string | null
  history: string | null
  added: string | null
  /** Whether those groups exist, once the list is in (null while it loads). */
  payFound: boolean | null
  historyFound: boolean | null
  remove: (names: readonly StudentsParam[]) => void
}

/**
 * Keeps the address honest (coach-students §1): a `pay` or `history` id that isn't a group
 * goes once the list is in, and `added` goes as soon as the page has read it (the page keeps
 * the highlight itself). Removals replace the entry.
 */
export function useStaleParams(input: StaleParamsInput) {
  const stale = [
    input.added !== null && 'added',
    input.pay !== null && input.payFound === false && 'pay',
    input.history !== null && input.historyFound === false && 'history',
  ].filter((name): name is StudentsParam => typeof name === 'string')
  const names = stale.join(' ')
  const remove = useEffectEvent((list: string) => input.remove(list.split(' ') as StudentsParam[]))
  useEffect(() => {
    if (names) remove(names)
  }, [names])
}
