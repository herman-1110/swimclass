import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { accountKeys } from '@/entities/account'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { AppError, readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { type CreateAccountInput, useCreateAccount } from './useCreateAccount'

// Runs in demo mode: demo/accounts.ts answers admin-accounts' create_account like the real
// Edge Function will (data-contracts §5.2), without sending an email.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderCreateAccount() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useCreateAccount(), { wrapper })
  return { result, invalidate }
}

const siti: CreateAccountInput = {
  username: 'siti.rahman',
  displayName: 'Siti Rahman',
  email: 'siti@example.com',
  phone: '012-345 6789',
}

async function failure(input: CreateAccountInput): Promise<AppError> {
  const { result } = renderCreateAccount()
  try {
    await act(() => result.current.mutateAsync(input))
  } catch (error) {
    if (error instanceof AppError) return error
    throw error
  }
  throw new Error('Expected create_account to fail')
}

describe('useCreateAccount', () => {
  it('creates an approved customer account and refreshes the accounts (scenario 12)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, invalidate } = renderCreateAccount()
    let accountId = ''
    await act(async () => {
      accountId = await result.current.mutateAsync(siti)
    })
    const [profile] = await readRows('profiles', { eq: { id: accountId } })
    expect(profile).toMatchObject({
      username: 'siti.rahman',
      display_name: 'Siti Rahman',
      phone: '012-345 6789',
      role: 'customer',
      approved: true,
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: accountKeys.all })
  })

  it('refuses a username that is taken', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const error = await failure({ ...siti, username: 'zulaikha', email: 'z2@example.com' })
    expect(error.code).toBe('username_taken')
  })

  it('refuses an email that another account uses', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const error = await failure({ ...siti, username: 'siti.two' })
    expect(error.code).toBe('email_taken')
  })

  it('refuses a username the database can’t take', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const error = await failure({ ...siti, username: 'has space', email: 'space@example.com' })
    expect(error.code).toBe('invalid_username')
  })

  it('is refused for a customer', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const error = await failure({ ...siti, username: 'sneaky', email: 'sneaky@example.com' })
    expect(error.code).toBe('not_coach')
  })
})
