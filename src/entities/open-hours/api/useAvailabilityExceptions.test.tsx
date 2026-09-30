import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { openHoursKeys } from './keys'
import { useAvailabilityExceptions } from './useAvailabilityExceptions'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW. The seed has
// no exceptions; beforeAll adds two as the coach.

let blocked: string
let extra: string

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  await logIn('herman', DEMO_PASSWORD)
  blocked = await rpc('add_exception', {
    p_kind: 'closed',
    p_starts_at: '2026-10-04T20:00:00+08:00',
    p_ends_at: '2026-10-05T09:00:00+08:00',
    p_note: 'Pool maintenance',
  })
  extra = await rpc('add_exception', {
    p_kind: 'open',
    p_starts_at: '2026-10-07T15:00:00+08:00',
    p_ends_at: '2026-10-07T17:30:00+08:00',
  })
}, 60_000)

afterEach(cleanup)

function renderExceptions(from: string, to: string) {
  // A new client per test, so no test sees another's cache; no retries, so errors show at once.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useAvailabilityExceptions(from, to), { wrapper })
}

describe('useAvailabilityExceptions', () => {
  it('reads a customer the exceptions touching the days asked for, without the coach’s note', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderExceptions('2026-09-28', '2026-10-05')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([
      {
        id: blocked,
        kind: 'closed',
        // Table columns come back as UTC text.
        starts_at: '2026-10-04T12:00:00+00:00',
        ends_at: '2026-10-05T01:00:00+00:00',
        created_at: expect.any(String) as string,
      },
    ])
    expect(JSON.stringify(result.current.data)).not.toContain('Pool maintenance')
  })

  it('finds one that crosses midnight from the next week too, in start order', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderExceptions('2026-10-05', '2026-10-12')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((row) => [row.id, row.kind])).toEqual([
      [blocked, 'closed'],
      [extra, 'open'],
    ])
    expect(Object.keys(result.current.data?.[0] ?? {}).sort()).toEqual([
      'created_at',
      'ends_at',
      'id',
      'kind',
      'starts_at',
    ])
  })

  it('finds nothing in a week without changes', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderExceptions('2026-10-12', '2026-10-19')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('keys each range under openHoursKeys.all, so Block time can refresh it', () => {
    expect(openHoursKeys.exceptions('2026-09-28', '2026-10-05')).toEqual([
      'open-hours',
      'exceptions',
      '2026-09-28',
      '2026-10-05',
    ])
  })
})
