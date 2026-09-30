import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { bookedLessons, weekExceptions } from '../model/select'
import { scheduleKeys } from './keys'
import { useCoachDay, useCoachWeek } from './useCoachWeek'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderQuery<T, P>(hook: (props: P) => T, initialProps?: P) {
  // A new client per test, so no test sees another's cache; no retries, so errors show at once.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(hook, { wrapper, initialProps })
}

describe('useCoachWeek', () => {
  it('reads the coach’s week of 28 Sep: 14 lessons with names, places and flags', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderQuery(() => useCoachWeek('2026-09-28'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const week = result.current.data ?? []
    expect(week.map((day) => bookedLessons(day).length)).toEqual([1, 1, 1, 2, 2, 3, 4])
    const [weiJie, kai] = week[4].lessons
    expect(weiJie).toMatchObject({
      display_names: 'Wei Jie',
      location: 'Palm Court',
      status: 'booked',
      travel_before: 60,
      travel_after: 0,
      unpaid: true,
      package_no: 2,
      lesson_in_package: 3,
    })
    expect(kai).toMatchObject({ display_names: 'Kai', gap_override: true, travel_before: 0 })
    expect(week[6].lessons.find((l) => l.display_names === 'Chloe')?.lessons).toBe(2)
    expect(week[3].lessons[0]).toMatchObject({ display_names: 'Priya', last_lesson: true })
    expect(week[5].lessons[0]).toMatchObject({
      display_names: 'Aiman & Sofia',
      account_name: 'Mei Ling',
      type_label: '1-to-2',
      size: 2,
    })
  })

  it('fails with not_coach for a customer', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderQuery(() => useCoachWeek('2026-09-28'))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ name: 'AppError', code: 'not_coach' })
  })

  it('keeps the last week on screen while the next one loads', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const [shown, next]: string[] = ['2026-09-28', '2026-10-05']
    const { result, rerender } = renderQuery((week: string) => useCoachWeek(week), shown)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    rerender(next)
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data?.[0].day).toBe('2026-09-28')
    await waitFor(() => expect(result.current.data?.[0].day).toBe('2026-10-05'))
    expect(result.current.data?.flatMap((day) => day.lessons)).toEqual([])
  })

  it('keys each week under scheduleKeys.all, apart from the customer’s', () => {
    expect(scheduleKeys.coachWeek('2026-09-28')).toEqual(['schedule', 'coach-week', '2026-09-28'])
  })
})

describe('useCoachDay', () => {
  it('selects one day of its week: today, Sat 26 Sep, as drawn in the Today section', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderQuery(() => useCoachDay('2026-09-26'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.day).toBe('2026-09-26')
    expect(
      result.current.data?.lessons.map((l) => [l.display_names, l.location, l.used, l.unpaid]),
    ).toEqual([
      ['Ethan', 'Kiara Park', true, false],
      ['Aiman & Sofia', 'Palm Court', false, false],
      ['Hana', 'Sunrise Res.', false, true],
    ])
  })
})

describe('blocked time in the coach’s week', () => {
  // Writes to this file's database: keep it last.
  it('lists it with its note on each day it touches, and closes that time', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const id = await rpc('add_exception', {
      p_kind: 'closed',
      p_starts_at: '2026-10-04T20:00:00+08:00',
      p_ends_at: '2026-10-05T09:00:00+08:00',
      p_note: ' Pool maintenance ',
    })
    const { result } = renderQuery(() => ({
      first: useCoachWeek('2026-09-28'),
      next: useCoachWeek('2026-10-05'),
    }))
    await waitFor(() => expect(result.current.next.isSuccess).toBe(true))
    await waitFor(() => expect(result.current.first.isSuccess).toBe(true))
    const sunday = result.current.first.data?.[6]
    const exception = {
      id,
      kind: 'closed',
      starts_at: '2026-10-04T20:00:00+08:00',
      ends_at: '2026-10-05T09:00:00+08:00',
      note: 'Pool maintenance',
    }
    expect(sunday?.exceptions).toEqual([exception])
    expect(sunday?.closed).toEqual([
      { starts_at: '2026-10-04T20:00:00+08:00', ends_at: '2026-10-05T00:00:00+08:00' },
    ])
    expect(sunday?.open.at(-1)).toEqual({
      starts_at: '2026-10-04T16:00:00+08:00',
      ends_at: '2026-10-04T20:00:00+08:00',
    })
    expect(result.current.next.data?.[0].exceptions).toEqual([exception])
    expect(weekExceptions(result.current.first.data ?? [])).toEqual([exception])
  })
})
