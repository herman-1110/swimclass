import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut, signUp } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { scheduleKeys } from './keys'
import { useCustomerWeek, useOwnLessonsOnDay } from './useCustomerWeek'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderQuery<T>(hook: () => T, queryClient = newClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(hook, { wrapper })
}

function newClient() {
  // A new client per test, so no test sees another's cache; no retries, so errors show at once.
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('useCustomerWeek', () => {
  it('reads meiling’s week of 28 Sep: 14 lessons, two of them hers', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderQuery(() => useCustomerWeek('2026-09-28'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const week = result.current.data ?? []
    expect(week.map((day) => day.day)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
    expect(week.flatMap((day) => day.busy)).toHaveLength(14)
    expect(
      week.flatMap((day) => day.busy.filter((lesson) => lesson.mine).map((l) => l.starts_at)),
    ).toEqual(['2026-10-03T09:00:00+08:00', '2026-10-04T17:00:00+08:00'])
    expect(week[5].open).toEqual([
      { starts_at: '2026-10-03T07:00:00+08:00', ends_at: '2026-10-03T12:00:00+08:00' },
      { starts_at: '2026-10-03T16:00:00+08:00', ends_at: '2026-10-03T22:00:00+08:00' },
    ])
  })

  it('never carries another customer’s name, place or ids (CLAUDE.md rule 6)', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderQuery(() => useCustomerWeek('2026-09-28'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const text = JSON.stringify(result.current.data)
    for (const word of [
      'Hana',
      'Wei Jie',
      'Palm Court',
      'Sunrise',
      'c0000000-0000-4000-8000-000000000003',
    ]) {
      expect(text).not.toContain(word)
    }
    const keys = new Set(
      (result.current.data ?? []).flatMap((day) =>
        day.busy.flatMap((lesson) => Object.keys(lesson)),
      ),
    )
    expect([...keys].sort()).toEqual([
      'booking_id',
      'ends_at',
      'group_id',
      'mine',
      'starts_at',
      'travel_after',
      'travel_before',
    ])
  })

  it('shows the coach no lesson of his own (View as customer)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderQuery(() => useCustomerWeek('2026-09-28'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const lessons = (result.current.data ?? []).flatMap((day) => day.busy)
    expect(lessons).toHaveLength(14)
    expect(lessons.some((lesson) => lesson.mine)).toBe(false)
  })

  it('fails with not_approved for an account still waiting for approval', async () => {
    await signUp({
      username: 'schedule_waiting',
      displayName: 'Still Waiting',
      email: 'schedule-waiting@example.com',
      phone: null,
      password: DEMO_PASSWORD,
    })
    await logIn('schedule_waiting', DEMO_PASSWORD)
    const { result } = renderQuery(() => useCustomerWeek('2026-09-28'))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ name: 'AppError', code: 'not_approved' })
  })

  it('keys each week under scheduleKeys.all, so a change can refresh them all', () => {
    expect(scheduleKeys.customerWeek('2026-09-28')).toEqual([
      'schedule',
      'customer-week',
      '2026-09-28',
    ])
  })
})

describe('useOwnLessonsOnDay', () => {
  it('selects the viewer’s own lessons of a day from the week’s one request', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const queryClient = newClient()
    const { result } = renderQuery(
      () => ({
        week: useCustomerWeek('2026-09-28'),
        saturday: useOwnLessonsOnDay('2026-09-28', '2026-10-03'),
        friday: useOwnLessonsOnDay('2026-09-28', '2026-10-02'),
      }),
      queryClient,
    )
    await waitFor(() => expect(result.current.saturday.isSuccess).toBe(true))
    expect(result.current.saturday.data).toEqual([
      {
        starts_at: '2026-10-03T09:00:00+08:00',
        ends_at: '2026-10-03T10:00:00+08:00',
        travel_before: 60,
        travel_after: 60,
        mine: true,
        booking_id: 'd0000000-0000-4000-8000-000000000002',
        group_id: 'c0000000-0000-4000-8000-000000000001',
      },
    ])
    expect(result.current.friday.data).toEqual([])
    expect(queryClient.getQueryCache().findAll({ queryKey: scheduleKeys.all })).toHaveLength(1)
  })

  it('finds nothing of the coach’s own', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderQuery(() => useOwnLessonsOnDay('2026-09-28', '2026-10-03'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
