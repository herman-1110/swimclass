import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { MIN_PASSWORD_LENGTH } from '@/shared/config/messages'

import { useSendPasswordReset } from './useSendPasswordReset'
import { useSetNewPassword } from './useSetNewPassword'

// Runs in demo mode: the real migrations and seed in PGlite. Demo mode sends no reset
// email; the reset page works for a signed-in account (auth spec §5.5).

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(async () => {
  cleanup()
  await logOut()
})

/** A new client for each hook, so no test sees another's cache. */
function newWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

/** Sets a new password through the hook; resolves with nothing, or with the failure. */
function renderUseSetNewPassword() {
  const { result } = renderHook(() => useSetNewPassword(), { wrapper: newWrapper() })
  return (password: string) =>
    act(() => result.current.mutateAsync(password).catch((error: unknown) => error))
}

describe('useSendPasswordReset', () => {
  it('answers the same for any address (demo mode sends nothing)', async () => {
    const { result } = renderHook(() => useSendPasswordReset(), { wrapper: newWrapper() })
    for (const email of ['meiling@example.com', 'nobody@example.com']) {
      await expect(act(() => result.current.mutateAsync(email))).resolves.toBeUndefined()
    }
  })
})

describe('useSetNewPassword', () => {
  it('needs a session: the link signs the person in', async () => {
    const save = renderUseSetNewPassword()
    expect(await save('swim-new-2026')).toMatchObject({ code: 'not_signed_in' })
  })

  it('refuses a short password and the current one', async () => {
    await logIn('weijie', DEMO_PASSWORD)
    const save = renderUseSetNewPassword()
    expect(await save('x'.repeat(MIN_PASSWORD_LENGTH - 1))).toMatchObject({
      code: 'weak_password',
    })
    expect(await save(DEMO_PASSWORD)).toMatchObject({ code: 'same_password' })
  })

  it('saves the new password: the old one stops working', async () => {
    await logIn('weijie', DEMO_PASSWORD)
    const save = renderUseSetNewPassword()
    expect(await save('swim-new-2026')).toBeUndefined()
    await logOut()
    await expect(logIn('weijie', DEMO_PASSWORD)).rejects.toMatchObject({ code: 'invalid_login' })
    await expect(logIn('weijie', 'swim-new-2026')).resolves.toMatchObject({
      email: 'weijie@example.com',
    })
  })
})
