import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { announcementKeys } from '@/entities/announcement'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { usePostAnnouncement } from './usePostAnnouncement'
import { useRemoveAnnouncement } from './useRemoveAnnouncement'

// Runs in demo mode: the real migrations and seed in PGlite.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

async function wrapper() {
  await logIn('herman', DEMO_PASSWORD)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { Wrapper, invalidate }
}

describe('usePostAnnouncement', () => {
  it('emails every approved customer, pins as asked, and refreshes the announcements', async () => {
    const { Wrapper, invalidate } = await wrapper()
    const onPosted = vi.fn()
    const { result } = renderHook(() => usePostAnnouncement({ onPosted }), { wrapper: Wrapper })
    act(() => result.current.mutate({ message: '  Pool closed Friday.  ', pinned: true }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onPosted).toHaveBeenCalledWith({ message: '  Pool closed Friday.  ', pinned: true })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: announcementKeys.all })
    const [row] = await readRows('announcements', { eq: { id: result.current.data ?? '' } })
    expect(row).toMatchObject({ message: 'Pool closed Friday.', pinned: true, send_email: true })
  })

  it('refuses a blank message in the coach’s words (invalid_message)', async () => {
    const { Wrapper } = await wrapper()
    const { result } = renderHook(() => usePostAnnouncement(), { wrapper: Wrapper })
    act(() => result.current.mutate({ message: '   ', pinned: true }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'invalid_message' })
  })
})

describe('useRemoveAnnouncement', () => {
  it('removes a message, twice without complaint, and refreshes the announcements', async () => {
    const { Wrapper, invalidate } = await wrapper()
    const [posted] = await readRows('announcements', { isNull: ['removed_at'] })
    const onRemoved = vi.fn()
    const { result } = renderHook(() => useRemoveAnnouncement({ onRemoved }), { wrapper: Wrapper })
    act(() => result.current.mutate({ id: posted.id }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onRemoved).toHaveBeenCalledWith({ id: posted.id })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: announcementKeys.all })
    act(() => result.current.mutate({ id: posted.id }))
    await waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(2))
    const [row] = await readRows('announcements', { eq: { id: posted.id } })
    expect(row.removed_at).not.toBeNull()
  })
})
