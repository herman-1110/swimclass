import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_NOW, DEMO_PASSWORD } from '@/shared/config/demo'

import { readGroupLessons, useExcusableLessons, useGroupLessons } from './useGroupLessons'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW. The last test
// excuses a lesson, so it comes last.

const HANA = 'c0000000-0000-4000-8000-000000000003'
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

describe('useGroupLessons', () => {
  it('lists every lesson of Wei Jie’s group for the coach, newest first', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderHook(() => useGroupLessons(WEI_JIE), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.hasMore).toBe(false)
    expect(result.current.data?.lessons[0]).toEqual({
      id: 'd0000000-0000-4000-8000-000000000008',
      group_id: WEI_JIE,
      starts_at: '2026-10-02T11:30:00+00:00',
      ends_at: '2026-10-02T12:30:00+00:00',
      location: 'Palm Court',
      status: 'booked',
      gap_override: false,
      cancelled_at: null,
      cancelled_by: null,
      cancel_reason: null,
      position: { package_no: 2, lesson_in_package: 3, lessons: 1 },
      used: false,
    })
    expect(
      result.current.data?.lessons.map((lesson) => [
        lesson.starts_at,
        lesson.used,
        lesson.position,
      ]),
    ).toEqual([
      ['2026-10-02T11:30:00+00:00', false, { package_no: 2, lesson_in_package: 3, lessons: 1 }],
      ['2026-09-25T11:30:00+00:00', true, { package_no: 2, lesson_in_package: 2, lessons: 1 }],
      ['2026-09-18T11:30:00+00:00', true, { package_no: 2, lesson_in_package: 1, lessons: 1 }],
    ])
  })

  it('keeps the gap override the coach booked with', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderHook(() => useGroupLessons(KAI), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.lessons.map((lesson) => lesson.gap_override)).toEqual([true])
  })

  it('waits while no group is chosen', () => {
    const { result } = renderHook(() => useGroupLessons(null), { wrapper: wrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('readGroupLessons', () => {
  it('keeps the newest lessons up to the limit, each with its numbers, and says older ones exist', async () => {
    await logIn('herman', DEMO_PASSWORD)
    // Both reads take the newest rows: the ledger's oldest rows would leave these without numbers.
    expect(await readGroupLessons(WEI_JIE, 1)).toEqual({
      lessons: [
        expect.objectContaining({
          starts_at: '2026-10-02T11:30:00+00:00',
          position: { package_no: 2, lesson_in_package: 3, lessons: 1 },
          used: false,
        }),
      ],
      hasMore: true,
    })
    const two = await readGroupLessons(WEI_JIE, 2)
    expect(two.hasMore).toBe(true)
    expect(
      two.lessons.map((lesson) => [lesson.starts_at, lesson.position?.lesson_in_package]),
    ).toEqual([
      ['2026-10-02T11:30:00+00:00', 3],
      ['2026-09-25T11:30:00+00:00', 2],
    ])
  })

  it('says no older lessons exist when the group has exactly the limit', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const three = await readGroupLessons(WEI_JIE, 3)
    expect(three.hasMore).toBe(false)
    expect(three.lessons).toHaveLength(3)
  })
})

describe('useExcusableLessons', () => {
  it('offers the lessons that have started: Wei Jie’s two Fridays', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderHook(() => useExcusableLessons(WEI_JIE, DEMO_NOW), {
      wrapper: wrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((lesson) => lesson.id)).toEqual([
      'd0000000-0000-4000-8000-000000000007',
      'd0000000-0000-4000-8000-000000000006',
    ])
  })

  it('offers none for Hana, whose lesson tonight hasn’t started', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderHook(() => useExcusableLessons(HANA, DEMO_NOW), {
      wrapper: wrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('drops a lesson once it is excused, which then shows without numbers', async () => {
    await logIn('herman', DEMO_PASSWORD)
    await rpc('excuse_booking', { p_booking_id: 'd0000000-0000-4000-8000-000000000007' })
    const lessons = renderHook(() => useGroupLessons(WEI_JIE), { wrapper: wrapper() })
    const excusable = renderHook(() => useExcusableLessons(WEI_JIE, DEMO_NOW), {
      wrapper: wrapper(),
    })
    await waitFor(() => expect(lessons.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(excusable.result.current.isSuccess).toBe(true))
    expect(lessons.result.current.data?.lessons[1]).toMatchObject({
      status: 'excused',
      position: null,
      used: null,
    })
    // The next lesson moves up: Fri 2 Oct is now lesson 2 of Package 2.
    expect(lessons.result.current.data?.lessons[0]?.position?.lesson_in_package).toBe(2)
    expect(excusable.result.current.data?.map((lesson) => lesson.id)).toEqual([
      'd0000000-0000-4000-8000-000000000006',
    ])
  })
})
