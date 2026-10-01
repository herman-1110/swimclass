import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { openHoursKeys } from '@/entities/open-hours'
import { coachWeekQuery, scheduleKeys } from '@/entities/schedule'
import { slotKeys } from '@/entities/slot'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { type AddExceptionsInput, useAddExceptions } from './useAddExceptions'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

async function renderAdd() {
  await logIn('herman', DEMO_PASSWORD)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const onSaved = vi.fn()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useAddExceptions({ onSaved }), { wrapper })
  return { result, invalidate, onSaved }
}

describe('useAddExceptions', () => {
  it('saves one exception a day, in date order, then refreshes the open time', async () => {
    const { result, invalidate, onSaved } = await renderAdd()
    const input: AddExceptionsInput = {
      kind: 'closed',
      dates: ['2026-10-03', '2026-10-04'],
      from: 1200,
      to: 1440,
      note: '  Gala night  ',
    }
    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(['2026-10-03', '2026-10-04'])
    expect(onSaved).toHaveBeenCalledWith(input)
    for (const queryKey of [scheduleKeys.all, slotKeys.all, openHoursKeys.all]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey })
    }
    const week = await new QueryClient().fetchQuery(coachWeekQuery('2026-09-28'))
    expect(week[5].exceptions).toHaveLength(1)
    expect(week[5].exceptions[0]).toMatchObject({
      kind: 'closed',
      starts_at: '2026-10-03T20:00:00+08:00',
      // "12:00 am (midnight)" ends at the next day's midnight.
      ends_at: '2026-10-04T00:00:00+08:00',
      note: 'Gala night',
    })
    expect(week[5].open.at(-1)?.ends_at).toBe('2026-10-03T20:00:00+08:00')
  })

  it('gives the refusal itself when the first day fails, and refreshes nothing', async () => {
    const { result, invalidate, onSaved } = await renderAdd()
    act(() =>
      result.current.mutate({ kind: 'open', dates: ['2026-10-07'], from: 600, to: 600, note: '' }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ name: 'AppError', code: 'invalid_range' })
    expect(onSaved).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
  })
})
