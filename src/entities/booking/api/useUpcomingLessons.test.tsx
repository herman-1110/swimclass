import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { bookingKeys } from './keys'
import { useUpcomingLessons } from './useUpcomingLessons'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

const AIMAN_SOFIA = 'c0000000-0000-4000-8000-000000000001'
const SOFIA = 'c0000000-0000-4000-8000-000000000002'
const HANA = 'c0000000-0000-4000-8000-000000000003'
const CHLOE = 'c0000000-0000-4000-8000-000000000008'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useUpcomingLessons', () => {
  it('lists meiling’s three lessons in start order, with numbers and places', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderHook(() => useUpcomingLessons([AIMAN_SOFIA, SOFIA]), {
      wrapper: wrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([
      {
        id: 'd0000000-0000-4000-8000-000000000001',
        group_id: AIMAN_SOFIA,
        starts_at: '2026-09-26T09:00:00+00:00',
        ends_at: '2026-09-26T10:00:00+00:00',
        location: 'Palm Court',
        position: { package_no: 4, lesson_in_package: 1, lessons: 1 },
      },
      {
        id: 'd0000000-0000-4000-8000-000000000002',
        group_id: AIMAN_SOFIA,
        starts_at: '2026-10-03T01:00:00+00:00',
        ends_at: '2026-10-03T02:00:00+00:00',
        location: 'Palm Court',
        position: { package_no: 4, lesson_in_package: 2, lessons: 1 },
      },
      {
        id: 'd0000000-0000-4000-8000-000000000003',
        group_id: SOFIA,
        starts_at: '2026-10-04T09:00:00+00:00',
        ends_at: '2026-10-04T10:00:00+00:00',
        location: 'Palm Court',
        position: { package_no: 2, lesson_in_package: 4, lessons: 1 },
      },
    ])
  })

  it('counts a 2-hour lesson as two', async () => {
    await logIn('grace', DEMO_PASSWORD)
    const { result } = renderHook(() => useUpcomingLessons([CHLOE]), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((lesson) => lesson.position)).toEqual([
      { package_no: 3, lesson_in_package: 1, lessons: 2 },
    ])
  })

  it('leaves out lessons that have ended (Ethan’s 9 am today)', async () => {
    await logIn('ethan', DEMO_PASSWORD)
    const { result } = renderHook(
      () => useUpcomingLessons(['c0000000-0000-4000-8000-000000000009']),
      { wrapper: wrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((lesson) => lesson.starts_at)).toEqual([
      '2026-10-04T00:00:00+00:00',
    ])
  })

  it('gives an empty list for an account with no groups: the coach viewing as a customer', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderHook(() => useUpcomingLessons([]), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('shows nothing of another account’s group', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderHook(() => useUpcomingLessons([HANA]), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('waits while the group ids are unknown', () => {
    const { result } = renderHook(() => useUpcomingLessons(null), { wrapper: wrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('keys the same groups the same way, under bookingKeys.all', () => {
    expect(bookingKeys.upcoming([SOFIA, AIMAN_SOFIA])).toEqual(
      bookingKeys.upcoming([AIMAN_SOFIA, SOFIA]),
    )
    expect(bookingKeys.upcoming([]).slice(0, 1)).toEqual([...bookingKeys.all])
  })
})
