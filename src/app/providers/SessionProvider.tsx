import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useEffect, useRef, useState } from 'react'

import { SessionContext, type SessionState } from '@/entities/account'
import { type AuthSession, getSession, onSessionChange } from '@/shared/api/auth'

/** Who is signed in, for the whole app (ARCHITECTURE §3.6): read with useSession(). */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<SessionState>({ status: 'loading' })
  const account = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    const apply = (session: AuthSession | null) => {
      if (!active) return
      const next = session?.userId ?? null
      // Another account must never see the last one's data.
      if (account.current !== undefined && account.current !== next) queryClient.clear()
      account.current = next
      setState(session ? { status: 'signed-in', session } : { status: 'signed-out' })
    }
    const stop = onSessionChange(apply)
    getSession().then(apply, () => apply(null))
    return () => {
      active = false
      stop()
    }
  }, [queryClient])

  return <SessionContext value={state}>{children}</SessionContext>
}
