import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { announcementKeys } from './keys'
import { useLatestAnnouncement } from './useLatestAnnouncement'
import { usePinnedAnnouncements } from './usePinnedAnnouncements'

// Runs in demo mode: the real migrations and seed in PGlite. The seed has no messages, so
// the tests post their own as herman, without emails. They share one database, in order.

const OLDER = 'Pool closed Friday 2 Oct for maintenance.'
const NEWER = 'If lightning closes the pool,\nyour lesson goes back to your package.'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderAnnouncements() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const useAnnouncements = () => ({
    pinned: usePinnedAnnouncements(),
    latest: useLatestAnnouncement(),
  })
  return { ...renderHook(useAnnouncements, { wrapper }), queryClient }
}

async function post(message: string, pinned = true) {
  await logIn('herman', DEMO_PASSWORD)
  return rpc('post_announcement', { p_message: message, p_send_email: false, p_pinned: pinned })
}

describe('usePinnedAnnouncements and useLatestAnnouncement', () => {
  it('find no message in the seed', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderAnnouncements()
    await waitFor(() => expect(result.current.latest.isSuccess).toBe(true))
    expect(result.current.pinned.data).toEqual([])
    expect(result.current.latest.data).toBeNull()
  })

  it('list the pinned messages newest first; the banner shows the newest', async () => {
    const older = await post(OLDER)
    const newer = await post(NEWER)
    await post('Not pinned: an email only.', false)

    await logIn('meiling', DEMO_PASSWORD)
    const { result, queryClient } = renderAnnouncements()
    await waitFor(() => expect(result.current.latest.isSuccess).toBe(true))
    expect(result.current.pinned.data).toEqual([
      { id: newer, message: NEWER, created_at: expect.any(String) as unknown },
      { id: older, message: OLDER, created_at: expect.any(String) as unknown },
    ])
    expect(result.current.latest.data).toMatchObject({ id: newer, message: NEWER })
    // The banner and the list share one read.
    expect(queryClient.getQueryCache().findAll({ queryKey: announcementKeys.all })).toHaveLength(1)
  })

  it('leave out a removed message for the coach too, whom RLS still shows it', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderAnnouncements()
    await waitFor(() => expect(result.current.latest.isSuccess).toBe(true))
    const newest = result.current.latest.data
    expect(newest?.message).toBe(NEWER)
    cleanup()

    await rpc('remove_announcement', { p_id: newest?.id ?? '' })
    const after = renderAnnouncements().result
    await waitFor(() => expect(after.current.latest.isSuccess).toBe(true))
    expect(after.current.pinned.data?.map((announcement) => announcement.message)).toEqual([OLDER])
    expect(after.current.latest.data?.message).toBe(OLDER)
  })

  it('keys the one read under announcementKeys.all', () => {
    expect(announcementKeys.pinned()).toEqual(['announcement', 'pinned'])
  })
})
