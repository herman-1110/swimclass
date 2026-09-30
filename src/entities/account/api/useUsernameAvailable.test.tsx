import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { accountKeys } from './keys'
import { usernameAvailableQuery, useUsernameAvailable } from './useUsernameAvailable'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderCheck(input: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const rendered = renderHook(({ value }) => useUsernameAvailable(value), {
    wrapper,
    initialProps: { value: input },
  })
  return { ...rendered, queryClient }
}

// The check waits 400 ms after the last keystroke, then asks the database.
const settles = { timeout: 3000 }

/** The usernames the database was asked about (a disabled query is cached but never runs). */
function askedAbout(queryClient: QueryClient): unknown[] {
  return queryClient
    .getQueryCache()
    .findAll({ queryKey: accountKeys.all })
    .filter(
      (q) =>
        q.state.dataUpdateCount + q.state.errorUpdateCount > 0 || q.state.fetchStatus !== 'idle',
    )
    .map((q) => q.queryKey.at(-1))
}

describe('useUsernameAvailable', () => {
  it('says nothing is typed, and makes no request', async () => {
    const { result, queryClient } = renderCheck('   ')
    expect(result.current).toEqual({ username: '', state: 'empty' })
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(askedAbout(queryClient)).toEqual([])
  })

  it('flags the wrong format at once, and never asks the database about it', async () => {
    await logOut()
    const { result, queryClient } = renderCheck('ab')
    expect(result.current).toEqual({ username: 'ab', state: 'invalid' })
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(result.current.state).toBe('invalid')
    expect(askedAbout(queryClient)).toEqual([])
  })

  it('checks a seeded username while signed out (anon), normalizing what was typed', async () => {
    await logOut()
    const { result } = renderCheck(' MeiLing ')
    expect(result.current).toEqual({ username: 'meiling', state: 'checking' })
    await waitFor(() => expect(result.current.state).toBe('taken'), settles)
    expect(result.current.username).toBe('meiling')
  })

  it('finds a free username, and checks again after typing stops', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, rerender } = renderCheck('herman')
    await waitFor(() => expect(result.current.state).toBe('taken'), settles)
    rerender({ value: 'siti.rahman' })
    // The last answer was for another name: nothing is claimed until the new one is checked.
    expect(result.current).toEqual({ username: 'siti.rahman', state: 'checking' })
    await waitFor(() => expect(result.current.state).toBe('available'), settles)
  })

  it('can be awaited on submit through the same query', async () => {
    await logOut()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await expect(queryClient.fetchQuery(usernameAvailableQuery('herman'))).resolves.toBe(false)
    await expect(queryClient.fetchQuery(usernameAvailableQuery('newbie'))).resolves.toBe(true)
    expect(usernameAvailableQuery('newbie').queryKey).toEqual([
      'account',
      'username-available',
      'newbie',
    ])
  })
})
