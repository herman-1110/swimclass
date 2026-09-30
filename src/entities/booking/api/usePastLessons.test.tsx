import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { PAST_LESSON_LIMIT, usePastLessons } from './usePastLessons'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW. The last
// tests change the data (a cancel, a series of past lessons), so they come last.

const AIMAN_SOFIA = 'c0000000-0000-4000-8000-000000000001'
const SOFIA = 'c0000000-0000-4000-8000-000000000002'
const WEI_JIE = 'c0000000-0000-4000-8000-000000000004'
const KAI = 'c0000000-0000-4000-8000-000000000010'

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

async function readPast(groupIds: string[]) {
  const { result } = renderHook(() => usePastLessons(groupIds), { wrapper: wrapper() })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  return result.current.data
}

describe('usePastLessons', () => {
  it('lists weijie’s ended lessons newest first, with their numbers and place', async () => {
    await logIn('weijie', DEMO_PASSWORD)
    expect(await readPast([WEI_JIE])).toEqual({
      hasMore: false,
      lessons: [
        {
          id: 'd0000000-0000-4000-8000-000000000007',
          group_id: WEI_JIE,
          starts_at: '2026-09-25T11:30:00+00:00',
          ends_at: '2026-09-25T12:30:00+00:00',
          location: 'Palm Court',
          status: 'done',
          cancelled_at: null,
          cancelled_by: null,
          cancel_reason: null,
          position: { package_no: 2, lesson_in_package: 2, lessons: 1 },
        },
        expect.objectContaining({
          id: 'd0000000-0000-4000-8000-000000000006',
          status: 'done',
          position: { package_no: 2, lesson_in_package: 1, lessons: 1 },
        }),
      ],
    })
  })

  it('finds none for meiling, whose used lessons are all in her starting balance', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    expect(await readPast([AIMAN_SOFIA, SOFIA])).toEqual({ lessons: [], hasMore: false })
  })

  it('reads nothing while the Past view is closed', () => {
    const { result } = renderHook(() => usePastLessons([WEI_JIE], { enabled: false }), {
      wrapper: wrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('lists cancelled lessons, also ones that were ahead, with who cancelled and why', async () => {
    const meiling = (await logIn('meiling', DEMO_PASSWORD)).userId
    await rpc('cancel_booking', { p_booking_id: 'd0000000-0000-4000-8000-000000000002' })
    const herman = (await logIn('herman', DEMO_PASSWORD)).userId
    await rpc('cancel_booking', {
      p_booking_id: 'd0000000-0000-4000-8000-000000000003',
      p_reason: 'Pool closed for maintenance',
    })

    await logIn('meiling', DEMO_PASSWORD)
    const past = await readPast([AIMAN_SOFIA, SOFIA])
    expect(past?.lessons.map((lesson) => [lesson.id, lesson.status])).toEqual([
      ['d0000000-0000-4000-8000-000000000003', 'cancelled'],
      ['d0000000-0000-4000-8000-000000000002', 'cancelled'],
    ])
    expect(past?.lessons[0]).toMatchObject({
      location: 'Palm Court',
      cancelled_by: herman,
      cancel_reason: 'Pool closed for maintenance',
      position: null,
    })
    expect(past?.lessons[1]).toMatchObject({
      cancelled_at: '2026-09-26T04:00:00+00:00',
      cancelled_by: meiling,
      cancel_reason: null,
    })
  })

  it(`keeps the latest ${PAST_LESSON_LIMIT} and says older ones exist`, async () => {
    await logIn('herman', DEMO_PASSWORD)
    // Kai's Mondays at 5:30 pm from 2 Mar: 22 lessons, all over by now.
    await rpc('coach_book', {
      p_group_id: KAI,
      p_starts_at: '2026-03-02T17:30:00+08:00',
      p_minutes: 60,
      p_repeat_weeks: 22,
      p_ignore_credit: true,
    })
    await logIn('kai', DEMO_PASSWORD)
    const past = await readPast([KAI])
    expect(past?.hasMore).toBe(true)
    expect(past?.lessons).toHaveLength(PAST_LESSON_LIMIT)
    expect(past?.lessons[0]).toMatchObject({
      starts_at: '2026-07-27T09:30:00+00:00',
      status: 'done',
      location: 'Palm Court',
      position: { package_no: 6, lesson_in_package: 2, lessons: 1 },
    })
  })
})
