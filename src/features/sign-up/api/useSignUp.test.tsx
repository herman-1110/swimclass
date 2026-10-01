import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { accountKeys } from '@/entities/account'
import { getSession, logIn, logOut, type SignUpInput } from '@/shared/api/auth'
import { demoDb } from '@/shared/api/demo/db'
import { MIN_PASSWORD_LENGTH } from '@/shared/config/messages'

import { useSignUp } from './useSignUp'

// Runs in demo mode: the real migrations, seed and sign-up trigger in PGlite. Demo sign-up
// counts the address as confirmed, so a new account can log in at once (auth spec §5.5).

const newbie: SignUpInput = {
  username: 'newbie',
  displayName: 'New Person',
  email: 'newbie@example.com',
  phone: '012-111 2222',
  password: 'swim-new-2026',
}

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(async () => {
  cleanup()
  await logOut()
})

/** Signs up through the hook; `run` resolves with the answer, or with the failure. */
function renderUseSignUp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useSignUp(), { wrapper })
  const run = (input: SignUpInput) =>
    act(() => result.current.mutateAsync(input).catch((error: unknown) => error))
  return { run, queryClient }
}

describe('useSignUp', () => {
  it('makes an account that waits for the coach’s approval', async () => {
    const { run } = renderUseSignUp()
    expect(await run(newbie)).toEqual({ confirmEmail: true })
    const { rows } = await (
      await demoDb()
    ).query(
      `select username, display_name, phone, role, approved from public.profiles
       where username = 'newbie'`,
    )
    expect(rows).toEqual([
      {
        username: 'newbie',
        display_name: 'New Person',
        phone: '012-111 2222',
        role: 'customer',
        approved: false,
      },
    ])
    // Nobody is signed in by it; the new account can log in (and then waits).
    expect(await getSession()).toBeNull()
    await expect(logIn('newbie', newbie.password)).resolves.toMatchObject({
      email: 'newbie@example.com',
    })
  })

  it('refuses a username that is taken, and the live check learns it too', async () => {
    const { run, queryClient } = renderUseSignUp()
    expect(await run({ ...newbie, username: 'meiling', email: 'mei@example.com' })).toMatchObject({
      name: 'AppError',
      code: 'username_taken',
    })
    expect(queryClient.getQueryData(accountKeys.usernameAvailable('meiling'))).toBe(false)
  })

  it('asks again when the account couldn’t be made: someone took the name meanwhile', async () => {
    const { run, queryClient } = renderUseSignUp()
    // A fresh "free" answer, as if the check ran just before someone else signed up.
    queryClient.setQueryData(accountKeys.usernameAvailable('herman'), true)
    expect(
      await run({ ...newbie, username: 'herman', email: 'not.herman@example.com' }),
    ).toMatchObject({ code: 'username_taken' })
    expect(queryClient.getQueryData(accountKeys.usernameAvailable('herman'))).toBe(false)
    const { rows } = await (
      await demoDb()
    ).query(`select 1 from auth.users where email = 'not.herman@example.com'`)
    expect(rows).toEqual([])
  })

  it('passes on the other refusals', async () => {
    const { run } = renderUseSignUp()
    // Demo mode refuses an address in use; Supabase would answer as if it had sent the email.
    expect(
      await run({ ...newbie, username: 'second.try', email: 'MeiLing@example.com' }),
    ).toMatchObject({ code: 'user_already_exists' })
    // Demo mode asks for as many characters as the forms do.
    expect(
      await run({
        ...newbie,
        username: 'third.try',
        email: 'third.try@example.com',
        password: 'x'.repeat(MIN_PASSWORD_LENGTH - 1),
      }),
    ).toMatchObject({ code: 'weak_password' })
  })
})
