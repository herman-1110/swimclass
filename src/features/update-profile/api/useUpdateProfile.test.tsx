import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { accountKeys, type Profile, SessionContext, useMyProfile } from '@/entities/account'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { type UpdateProfileInput, useUpdateProfile } from './useUpdateProfile'

// Runs in demo mode: the real migrations and seed in PGlite, with RLS and column grants.
// readRows is the real one, watched, so one test can make the profile's next read wait.
vi.mock('@/shared/api/rpc', async (importOriginal) => {
  const rpc = await importOriginal<typeof import('@/shared/api/rpc')>()
  return { ...rpc, readRows: vi.fn(rpc.readRows) }
})

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

  it('finishes only once the profile has been read again, so the sidebar’s name follows', async () => {
    const session = await logIn('meiling', DEMO_PASSWORD)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <SessionContext value={{ status: 'signed-in', session }}>{children}</SessionContext>
      </QueryClientProvider>
    )
    // The form and, on screen with it, the sidebar's "Signed in as …" (useMyProfile).
    const { result } = renderHook(() => ({ update: useUpdateProfile(), profile: useMyProfile() }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.profile.data?.display_name).toBe('Mei Ling'))

    // The profile's next read waits until it is let go.
    const read = vi.mocked(readRows)
    const realRead = read.getMockImplementation() as typeof readRows
    let letGo = () => {}
    const gate = new Promise<void>((resolve) => {
      letGo = resolve
    })
    read.mockClear()
    read.mockImplementationOnce((...args: Parameters<typeof readRows>) =>
      gate.then(() => realRead(...args)),
    )

    let saved = false
    await act(async () => {
      const saving = result.current.update
        .mutateAsync({ accountId: MEILING, displayName: 'Mei Ling Tan', phone: null })
        .then(() => {
          saved = true
        })
      // The new name is in, and the profile is being read again: the save waits for it.
      await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1))
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(saved).toBe(false)
      letGo()
      await saving
    })
    expect(queryClient.getQueryData<Profile | null>(accountKeys.me(MEILING))?.display_name).toBe(
      'Mei Ling Tan',
    )
    expect(await details(MEILING)).toMatchObject({ display_name: 'Mei Ling Tan' })
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
