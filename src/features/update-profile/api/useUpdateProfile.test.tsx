import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { accountKeys } from '@/entities/account'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { type UpdateProfileInput, useUpdateProfile } from './useUpdateProfile'

// Runs in demo mode: the real migrations and seed in PGlite, with RLS and column grants.

const MEILING = 'a0000000-0000-4000-8000-000000000002'
const FARAH = 'a0000000-0000-4000-8000-000000000003'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(async () => {
  cleanup()
  await logOut()
})

/** Saves through the hook; `save` resolves with nothing, or with the failure. */
function renderUseUpdateProfile() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useUpdateProfile(), { wrapper })
  const save = (input: UpdateProfileInput) =>
    act(() => result.current.mutateAsync(input).catch((error: unknown) => error))
  return { save, invalidate }
}

async function details(accountId: string) {
  const [profile] = await readRows('profiles', {
    eq: { id: accountId },
    columns: ['display_name', 'phone'],
  })
  return profile
}

describe('useUpdateProfile', () => {
  it('saves the name and phone, then refreshes the accounts', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { save, invalidate } = renderUseUpdateProfile()
    expect(
      await save({ accountId: MEILING, displayName: 'Mei Ling Tan', phone: '012-345 6789' }),
    ).toBeUndefined()
    expect(await details(MEILING)).toEqual({ display_name: 'Mei Ling Tan', phone: '012-345 6789' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: accountKeys.all })

    expect(await save({ accountId: MEILING, displayName: 'Mei Ling', phone: null })).toBeUndefined()
    expect(await details(MEILING)).toEqual({ display_name: 'Mei Ling', phone: null })
  })

  it('is refused a blank name by the database (the form checks it first)', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { save, invalidate } = renderUseUpdateProfile()
    expect(await save({ accountId: MEILING, displayName: '', phone: null })).toMatchObject({
      code: 'unknown',
    })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('changes nothing for another customer’s account (RLS)', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { save } = renderUseUpdateProfile()
    await save({ accountId: FARAH, displayName: 'Not Farah', phone: null })
    await logIn('farah', DEMO_PASSWORD)
    expect(await details(FARAH)).toEqual({ display_name: 'Farah', phone: '012-000 0003' })
  })
})
