import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { balanceKeys } from '@/entities/balance'
import { bookingKeys } from '@/entities/booking'
import { groupKeys } from '@/entities/group'
import { scheduleKeys } from '@/entities/schedule'
import { settingsKeys } from '@/entities/settings'
import { slotKeys } from '@/entities/slot'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { AppError, readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { refreshAfterBooking } from './refreshAfterBooking'
import { type BookLessonInput, useBookLesson } from './useBookLesson'

// Runs in demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00
// MYT. One database for the whole file: the refusals come first, then the bookings.

const AIMAN_AND_SOFIA = 'c0000000-0000-4000-8000-000000000001'
const SOFIA = 'c0000000-0000-4000-8000-000000000002'
const CHANGED = [slotKeys.all, balanceKeys.all, scheduleKeys.all, bookingKeys.all]

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderUseBookLesson(onBooked = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useBookLesson({ onBooked }), { wrapper })
  return { ...hook, invalidate, onBooked }
}

/** Books through the hook; gives the new ids, or the refusal. */
async function book(result: { current: ReturnType<typeof useBookLesson> }, input: BookLessonInput) {
  let outcome: unknown
  await act(async () => {
    outcome = await result.current.mutateAsync(input).catch((error: unknown) => error)
  })
  return outcome
}

/** The keys a spied invalidateQueries was called with, in order. */
function refreshed(invalidate: { mock: { calls: readonly (readonly unknown[])[] } }) {
  return invalidate.mock.calls.map(([filters]) => (filters as { queryKey: unknown }).queryKey)
}

describe('useBookLesson', () => {
  it('passes a clash on through as the reason week_slots gives (gap_after) and refreshes', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result, invalidate, onBooked } = renderUseBookLesson()
    const error = await book(result, {
      groupId: AIMAN_AND_SOFIA,
      startsAt: '2026-09-29T11:00:00+00:00',
      minutes: 60,
      repeatWeeks: 1,
    })
    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      code: 'gap_after',
      detail: { ends_at: '2026-09-29T18:30:00+08:00' },
    })
    expect(onBooked).not.toHaveBeenCalled()
    expect(refreshed(invalidate)).toEqual(expect.arrayContaining(CHANGED))
  })

  it('refuses a weekly booking whose later week clashes, booking nothing (repeat_conflict)', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUseBookLesson()
    const error = await book(result, {
      groupId: AIMAN_AND_SOFIA,
      startsAt: '2026-09-27T09:00:00+00:00',
      minutes: 60,
      repeatWeeks: 2,
    })
    expect(error).toMatchObject({ code: 'repeat_conflict', detail: { dates: ['2026-10-04'] } })
  })

  it('refuses more lessons than the group may still book (credit_exceeded)', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUseBookLesson()
    const error = await book(result, {
      groupId: SOFIA,
      startsAt: '2026-10-06T11:30:00+00:00',
      minutes: 120,
      repeatWeeks: 3,
    })
    expect(error).toMatchObject({
      code: 'credit_exceeded',
      detail: { needed: 6, can_still_book: 4 },
    })
  })

  it('books a lesson, tells the caller before the refresh, and refreshes what it changed', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const pendingWhenBooked: boolean[] = []
    const onBooked = vi.fn()
    const { result, invalidate } = renderUseBookLesson(onBooked)
    onBooked.mockImplementation(() => {
      // Called before the refresh: nothing refreshed yet, and the mutation still pending.
      pendingWhenBooked.push(invalidate.mock.calls.length === 0)
    })
    const input = {
      groupId: AIMAN_AND_SOFIA,
      startsAt: '2026-09-29T11:30:00+00:00',
      minutes: 60,
      repeatWeeks: 1,
    }
    const ids = await book(result, input)
    expect(ids).toHaveLength(1)
    expect(onBooked).toHaveBeenCalledWith(ids, input)
    expect(pendingWhenBooked).toEqual([true])
    expect(refreshed(invalidate)).toEqual(CHANGED)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [balance] = await readRows('group_balance', { eq: { group_id: AIMAN_AND_SOFIA } })
    expect(balance).toMatchObject({ package_no: 4, booked_in_package: 3, left_in_package: 1 })
  })

  it('books the same time every week for a weekly booking, all in start order', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderUseBookLesson()
    const ids = (await book(result, {
      groupId: AIMAN_AND_SOFIA,
      startsAt: '2026-09-30T09:30:00+00:00',
      minutes: 60,
      repeatWeeks: 2,
    })) as string[]
    expect(ids).toHaveLength(2)
    const rows = await readRows('bookings', { in: { id: ids }, order: [{ column: 'starts_at' }] })
    expect(rows.map((row) => [row.id, row.starts_at])).toEqual([
      [ids[0], '2026-09-30T09:30:00+00:00'],
      [ids[1], '2026-10-07T09:30:00+00:00'],
    ])
  })
})

describe('refreshAfterBooking', () => {
  function client() {
    const queryClient = new QueryClient()
    return { queryClient, invalidate: vi.spyOn(queryClient, 'invalidateQueries') }
  }

  it('refreshes start times, week views, balances and lesson lists (book §5.3.1)', async () => {
    const { queryClient, invalidate } = client()
    await refreshAfterBooking(queryClient)
    expect(refreshed(invalidate)).toEqual(CHANGED)
  })

  it('refreshes nothing after a network failure', async () => {
    const { queryClient, invalidate } = client()
    await refreshAfterBooking(queryClient, new AppError('network'))
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('reads the settings again after off_step and invalid_length', async () => {
    for (const code of ['off_step', 'invalid_length']) {
      const { queryClient, invalidate } = client()
      await refreshAfterBooking(queryClient, new AppError(code))
      expect(refreshed(invalidate)).toEqual([...CHANGED, settingsKeys.all])
    }
  })

  it('only marks the groups stale after group_inactive, for the next window focus', async () => {
    const { queryClient, invalidate } = client()
    await refreshAfterBooking(queryClient, new AppError('group_inactive'))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: groupKeys.all, refetchType: 'none' })
    expect(refreshed(invalidate)).toEqual([...CHANGED, groupKeys.all])
  })
})
