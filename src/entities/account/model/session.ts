import { createContext, useContext } from 'react'

import type { AuthSession } from '@/shared/api/auth'

/** Whether someone is signed in; `loading` until the first check has answered. */
export type SessionState =
  { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; session: AuthSession }

/** Filled in by app/providers/SessionProvider (ARCHITECTURE §3.6). */
export const SessionContext = createContext<SessionState>({ status: 'loading' })

export function useSession(): SessionState {
  return useContext(SessionContext)
}

/** The signed-in account's id, or null when signed out or still checking. */
export function useUserId(): string | null {
  const state = useSession()
  return state.status === 'signed-in' ? state.session.userId : null
}
