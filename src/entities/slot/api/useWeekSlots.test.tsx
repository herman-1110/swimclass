import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { type DateKey, formatTime } from '@/shared/lib/time'

import { freeCountByDay, slotsOfDay } from '../model/freeCountByDay'
import { slotKeys } from './keys'
import { useWeekSlots } from './useWeekSlots'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW (Sat 26 Sep
// 2026 12:00 MYT). The expected chips are book.md §8.2's (TECH_SPEC §10).

const AIMAN_AND_SOFIA = 'c0000000-0000-4000-8000-000000000001'
const SOFIA = 'c0000000-0000-4000-8000-000000000002'
const HANA = 'c0000000-0000-4000-8000-000000000003'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderUseWeekSlots(
  weekStart: string | null,
  minutes: number | null,
  groupId: string | null,
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return {
    ...renderHook(() => useWeekSlots(weekStart, minutes, groupId), { wrapper }),
    queryClient,
  }
}

describe('useWeekSlots', () => {
  it('reads every start of the week, free and crossed out, with their reasons', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUseWeekSlots('2026-09-28', 60, AIMAN_AND_SOFIA)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const slots = result.current.data ?? []
    expect(slots).toHaveLength(80)

    const tuesday = slotsOfDay(slots, '2026-09-29')
    expect(
      tuesday.map((slot) => [formatTime(slot.starts_at), slot.ok ? 'free' : slot.reason]),
    ).toEqual([
      ['5:30 pm', 'overlap_other'],
      ['6:00 pm', 'overlap_other'],
      ['6:30 pm', 'gap_after'],
      ['7:00 pm', 'gap_after'],
      ['7:30 pm', 'free'],
      ['8:00 pm', 'free'],
      ['8:30 pm', 'free'],
      ['9:00 pm', 'free'],
    ])
    expect(tuesday[0]).toEqual({
      day: '2026-09-29',
      starts_at: '2026-09-29T09:30:00+00:00',
      ok: false,
      reason: 'overlap_other',
      detail: { starts_at: '2026-09-29T17:30:00+08:00', ends_at: '2026-09-29T18:30:00+08:00' },
    })
    expect(tuesday[3].detail).toEqual({ ends_at: '2026-09-29T18:30:00+08:00' })
    expect(tuesday[4]).toMatchObject({ ok: true, reason: null, detail: null })
  })

  it('gives the day strip’s counts: Mon 1, Tue 4, Wed 3, Thu 0, Fri 1, Sat 6, Sun 1', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUseWeekSlots('2026-09-28', 60, AIMAN_AND_SOFIA)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect([...freeCountByDay(result.current.data ?? [])]).toEqual([
      ['2026-09-28', 1],
      ['2026-09-29', 4],
      ['2026-09-30', 3],
      ['2026-10-01', 0],
      ['2026-10-02', 1],
      ['2026-10-03', 6],
      ['2026-10-04', 1],
    ])
    // Sat 3 Oct 7:00 am is 2 Oct in UTC, but its day is the 3rd.
    expect(slotsOfDay(result.current.data ?? [], '2026-10-03')[0]).toMatchObject({
      starts_at: '2026-10-02T23:00:00+00:00',
      ok: true,
    })
  })

  it('reads 2-hour lessons separately', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUseWeekSlots('2026-09-28', 120, AIMAN_AND_SOFIA)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(62)
  })

  it('never asks without a group, a length and a week', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    for (const [week, minutes, group] of [
      ['2026-09-28', 60, null],
      ['2026-09-28', null, AIMAN_AND_SOFIA],
      [null, 60, AIMAN_AND_SOFIA],
    ] as const) {
      const { result } = renderUseWeekSlots(week, minutes, group)
      expect(result.current.isPending).toBe(true)
      expect(result.current.fetchStatus).toBe('idle')
    }
  })

  it('shows no old chips while a new week, length or group loads (book.md §6.1)', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    type Inputs = { week: DateKey; minutes: number; group: string }
    const { result, rerender } = renderHook(
      ({ week, minutes, group }: Inputs) => useWeekSlots(week, minutes, group),
      { wrapper, initialProps: { week: '2026-09-28', minutes: 60, group: AIMAN_AND_SOFIA } },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(80)

    // Each change, straight away: no data (no chips of the old inputs), then the new answer.
    const changeTo = async (inputs: Inputs) => {
      rerender(inputs)
      expect(result.current.data).toBeUndefined()
      expect(result.current.isPending).toBe(true)
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      return [...freeCountByDay(result.current.data ?? [])]
    }
    const freeWeek = (weekday: number, weekend: number) => [
      ['2026-10-05', weekday],
      ['2026-10-06', weekday],
      ['2026-10-07', weekday],
      ['2026-10-08', weekday],
      ['2026-10-09', weekday],
      ['2026-10-10', weekend],
      ['2026-10-11', weekend],
    ]

    // Next week, completely free (book.md §8.2): 8 starts on weekdays and 20 at weekends.
    expect(await changeTo({ week: '2026-10-05', minutes: 60, group: AIMAN_AND_SOFIA })).toEqual(
      freeWeek(8, 20),
    )
    // 2 hours: 6 and 16.
    expect(await changeTo({ week: '2026-10-05', minutes: 120, group: AIMAN_AND_SOFIA })).toEqual(
      freeWeek(6, 16),
    )
    // Her other group: the same starts, asked for again.
    expect(await changeTo({ week: '2026-10-05', minutes: 120, group: SOFIA })).toEqual(
      freeWeek(6, 16),
    )
  })

  it('fails with not_your_group for another account’s group', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUseWeekSlots('2026-09-28', 60, HANA)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ name: 'AppError', code: 'not_your_group' })
  })

  it('keys each week, length and group apart under slotKeys.all', () => {
    expect(slotKeys.week('2026-09-28', 60, AIMAN_AND_SOFIA)).toEqual([
      'slot',
      'week',
      '2026-09-28',
      60,
      AIMAN_AND_SOFIA,
    ])
  })
})
