import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { groupKeys } from './keys'
import { useCoachGroups } from './useCoachGroups'
import { useGroupLocations } from './useGroupLocations'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderHooks<T>(hooks: () => T) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { ...renderHook(hooks, { wrapper }), queryClient }
}

describe('useCoachGroups', () => {
  it('reads every group for the coach, sorted by names', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderHooks(() => useCoachGroups())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((group) => group.display_names)).toEqual([
      'Adam, Alya & Amir',
      'Aiman & Sofia',
      'Aina',
      'Chloe',
      'Daniel',
      'Ethan',
      'Hana',
      'Jun Hao',
      'Kai',
      'Nurul',
      'Priya',
      'Sofia',
      'Wei Jie',
    ])
    expect(result.current.data?.[0]).toMatchObject({
      size: 3,
      type_label: '1-to-3',
      location: 'Maple Condo',
      active: true,
    })
  })

  it('selects the locations from that one read', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, queryClient } = renderHooks(() => ({
      groups: useCoachGroups(),
      locations: useGroupLocations(),
    }))
    await waitFor(() => expect(result.current.locations.isSuccess).toBe(true))

    expect(result.current.locations.data).toEqual([
      'Kiara Park',
      'Maple Condo',
      'Palm Court',
      'Seri Maya',
      'Sunrise Res.',
      'Vista Heights',
    ])
    // One request serves every narrower hook.
    expect(queryClient.getQueryCache().findAll({ queryKey: groupKeys.all })).toHaveLength(1)
  })

  it('keys the coach’s read under groupKeys.all', () => {
    expect(groupKeys.coach()).toEqual(['group', 'coach'])
  })
})
