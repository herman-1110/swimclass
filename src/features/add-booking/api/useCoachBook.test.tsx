import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { balanceKeys } from '@/entities/balance'
import { bookingKeys } from '@/entities/booking'
import { groupKeys } from '@/entities/group'
import { scheduleKeys } from '@/entities/schedule'
import { slotKeys } from '@/entities/slot'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { type CoachBookInput, useCoachBook } from './useCoachBook'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

const NURUL = 'c0000000-0000-4000-8000-000000000013'
const KAI = 'c0000000-0000-4000-8000-000000000010'
const JUN_HAO = 'c0000000-0000-4000-8000-000000000007'

const base: CoachBookInput = {
  groupId: NURUL,
  startsAt: '2026-09-30T17:30:00+08:00',
  minutes: 60,
  repeatWeeks: 1,
  ignoreOpenHours: false,
  gapOverride: false,
  ignoreCredit: false,
}

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

async function renderBook() {
  await logIn('herman', DEMO_PASSWORD)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const onBooked = vi.fn()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useCoachBook({ onBooked }), { wrapper })
  return { result, invalidate, onBooked }
}

describe('useCoachBook', () => {
  it('books with coach_book, then refreshes everything a booking changes', async () => {
    const { result, invalidate, onBooked } = await renderBook()
    act(() => result.current.mutate(base))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const [ids] = onBooked.mock.calls[0] as [string[], CoachBookInput]
    expect(ids).toHaveLength(1)
    expect(invalidate).toHaveBeenCalledTimes(4)
    for (const queryKey of [scheduleKeys.all, slotKeys.all, balanceKeys.all, bookingKeys.all]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey })
    }
    const [booking] = await readRows('bookings', { eq: { id: ids[0] } })
    expect(booking).toMatchObject({ group_id: NURUL, status: 'booked', gap_override: false })
  })

  it('books past the travel gap with the override (§8.3: Kai, Tue 29 Sep 7:00 pm)', async () => {
    const { result } = await renderBook()
    const input = { ...base, groupId: KAI, startsAt: '2026-09-29T19:00:00+08:00' }
    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({
      code: 'gap_after',
      detail: { ends_at: '2026-09-29T18:30:00+08:00' },
    })
    act(() => result.current.mutate({ ...input, gapOverride: true }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const [booking] = await readRows('bookings', { eq: { id: (result.current.data ?? [])[0] } })
    expect(booking.gap_override).toBe(true)
  })

  it('refreshes the live check after a clash', async () => {
    const { result, invalidate } = await renderBook()
    act(() =>
      result.current.mutate({ ...base, groupId: KAI, startsAt: '2026-09-29T17:30:00+08:00' }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'overlap_other' })
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: slotKeys.all })
  })

  it('refreshes the groups when the group was paused meanwhile (§6.7)', async () => {
    const { result, invalidate } = await renderBook()
    // Pausing needs no upcoming lessons: cancel Jun Hao's, then pause the group.
    const upcoming = await readRows('bookings', {
      eq: { group_id: JUN_HAO, status: 'booked' },
      gte: { starts_at: '2026-09-26T04:00:00+00:00' },
    })
    for (const booking of upcoming) await rpc('cancel_booking', { p_booking_id: booking.id })
    await rpc('set_group_active', { p_group_id: JUN_HAO, p_active: false })
    act(() => result.current.mutate({ ...base, groupId: JUN_HAO }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'group_inactive' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: groupKeys.all })
  })
})
