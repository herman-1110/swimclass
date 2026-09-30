import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { type AuthSession, getSession, logIn, logOut, signUp } from '@/shared/api/auth'
import { demoDb } from '@/shared/api/demo/db'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { SessionContext, type SessionState } from '../model/session'
import { useMyProfile } from './useMyProfile'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderUseMyProfile(state: SessionState, options?: Parameters<typeof useMyProfile>[0]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SessionContext value={state}>{children}</SessionContext>
    </QueryClientProvider>
  )
  return renderHook(() => useMyProfile(options), { wrapper })
}

const signedIn = (session: AuthSession): SessionState => ({ status: 'signed-in', session })

describe('useMyProfile', () => {
  it('reads the signed-in customer’s own profile', async () => {
    const session = await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUseMyProfile(signedIn(session))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({
      id: session.userId,
      username: 'meiling',
      display_name: 'Mei Ling',
      role: 'customer',
      approved: true,
    })
  })

  it('reads only the coach’s own profile, although RLS shows him every one', async () => {
    const session = await logIn('herman', DEMO_PASSWORD)
    const { result } = renderUseMyProfile(signedIn(session))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({ username: 'herman', role: 'coach' })
  })

  it('waits while nobody is signed in', async () => {
    await logOut()
    const { result } = renderUseMyProfile({ status: 'signed-out' })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  it('polls with refetchInterval, so an approval shows without a reload', async () => {
    await signUp({
      username: 'profile_poll',
      displayName: 'Poll Waiting',
      email: 'profile-poll@example.com',
      phone: null,
      password: DEMO_PASSWORD,
    })
    const session = await logIn('profile_poll', DEMO_PASSWORD)
    const { result } = renderUseMyProfile(signedIn(session), { refetchInterval: 100 })
    await waitFor(() => expect(result.current.data?.approved).toBe(false))

    // The coach approves on another device.
    const db = await demoDb()
    await db.query('update public.profiles set approved = true where id = $1', [session.userId])

    await waitFor(() => expect(result.current.data?.approved).toBe(true), { timeout: 3000 })
  })
})
