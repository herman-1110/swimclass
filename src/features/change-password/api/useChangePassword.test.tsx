import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { MIN_PASSWORD_LENGTH } from '@/shared/config/messages'

import { useChangePassword } from './useChangePassword'

// Runs in demo mode: the real migrations and seed in PGlite.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(async () => {
  cleanup()
  await logOut()
})

/** Changes the password through the hook; resolves with nothing, or with the failure. */
function renderUseChangePassword() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useChangePassword(), { wrapper })
  return (password: string) =>
    act(() => result.current.mutateAsync(password).catch((error: unknown) => error))
}

describe('useChangePassword', () => {
  it('refuses a short password and the current one', async () => {
    await logIn('priya', DEMO_PASSWORD)
    const change = renderUseChangePassword()
    expect(await change('x'.repeat(MIN_PASSWORD_LENGTH - 1))).toMatchObject({
      code: 'weak_password',
    })
    expect(await change(DEMO_PASSWORD)).toMatchObject({ code: 'same_password' })
  })

  it('changes the signed-in account’s password', async () => {
    await logIn('priya', DEMO_PASSWORD)
    const change = renderUseChangePassword()
    expect(await change('x'.repeat(MIN_PASSWORD_LENGTH))).toBeUndefined()
    await logOut()
    await expect(logIn('priya', 'x'.repeat(MIN_PASSWORD_LENGTH))).resolves.toMatchObject({
      email: 'priya@example.com',
    })
  })

  it('fails without a session', async () => {
    const change = renderUseChangePassword()
    expect(await change('swim-new-2026')).toMatchObject({ code: 'not_signed_in' })
  })
})
