import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { type LogInInput, useLogIn } from './useLogIn'

// Runs in demo mode: the real migrations and seed in PGlite, and demo mode's stand-in for
// the `login` Edge Function.

const MEILING = 'a0000000-0000-4000-8000-000000000002'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(async () => {
  cleanup()
  await logOut()
})

/** Logs in through the hook; resolves with the session, or with the failure. */
function renderUseLogIn() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useLogIn(), { wrapper })
  return (input: LogInInput) =>
    act(() => result.current.mutateAsync(input).catch((error: unknown) => error))
}

describe('useLogIn', () => {
  it('logs in with the username trimmed and lowercased', async () => {
    const logIn = renderUseLogIn()
    const session = await logIn({ username: ' MeiLing ', password: DEMO_PASSWORD })
    expect(session).toEqual({ userId: MEILING, email: 'meiling@example.com' })
    expect(await getSession()).toEqual(session)
  })

  it('says only invalid_login, whatever was wrong', async () => {
    const logIn = renderUseLogIn()
    for (const [username, password] of [
      ['meiling', 'wrong'],
      ['nobody', DEMO_PASSWORD],
      // The password is sent as typed, never trimmed.
      ['meiling', ` ${DEMO_PASSWORD}`],
    ]) {
      expect(await logIn({ username, password })).toMatchObject({
        name: 'AppError',
        code: 'invalid_login',
      })
    }
    expect(await getSession()).toBeNull()
  })

  it('pauses a username after 10 failures in 15 minutes, even with the right password', async () => {
    const logIn = renderUseLogIn()
    for (let attempt = 0; attempt < 10; attempt++) {
      expect(await logIn({ username: 'zulaikha', password: `wrong-${attempt}` })).toMatchObject({
        code: 'invalid_login',
      })
    }
    expect(await logIn({ username: 'zulaikha', password: DEMO_PASSWORD })).toMatchObject({
      code: 'too_many_attempts',
    })
    // Other usernames still work.
    expect(await logIn({ username: 'grace', password: DEMO_PASSWORD })).toMatchObject({
      email: 'grace@example.com',
    })
  })
})
