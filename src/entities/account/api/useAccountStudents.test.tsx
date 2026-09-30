import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { accountKeys } from './keys'
import { type StudentOrder, useAccountStudents } from './useAccountStudents'

// Runs in demo mode: the real migrations and seed in PGlite, clock at DEMO_NOW.

const HERMAN = 'a0000000-0000-4000-8000-000000000001'
const MEILING = 'a0000000-0000-4000-8000-000000000002'
const FARAH = 'a0000000-0000-4000-8000-000000000003'
const ZULAIKHA = 'a0000000-0000-4000-8000-000000000006'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderStudents(accountId: string | null, order?: StudentOrder) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const rendered = renderHook(({ id }) => useAccountStudents(id, { order }), {
    wrapper,
    initialProps: { id: accountId },
  })
  return { ...rendered, queryClient }
}

describe('useAccountStudents', () => {
  it('gives the coach an account’s active students in the order they were added', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderStudents(ZULAIKHA)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((s) => s.name)).toEqual(['Adam', 'Alya', 'Amir'])
    expect(result.current.data?.[0]).toMatchObject({
      id: 'b0000000-0000-4000-8000-000000000006',
      account_id: ZULAIKHA,
      active: true,
    })
  })

  it('switches accounts without another request', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, rerender, queryClient } = renderStudents(ZULAIKHA)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    rerender({ id: MEILING })
    expect(result.current.data?.map((s) => s.name)).toEqual(['Aiman', 'Sofia'])
    expect(queryClient.getQueryCache().findAll({ queryKey: accountKeys.all })).toHaveLength(1)
  })

  it('sorts by name when asked (My classes)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderStudents(MEILING, 'name')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.map((s) => s.name)).toEqual(['Aiman', 'Sofia'])
  })

  it('gives a customer their own students, and nobody else’s (RLS)', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const own = renderStudents(MEILING, 'name')
    await waitFor(() => expect(own.result.current.isSuccess).toBe(true))
    expect(own.result.current.data?.map((s) => s.name)).toEqual(['Aiman', 'Sofia'])
    own.rerender({ id: FARAH })
    expect(own.result.current.data).toEqual([])
  })

  it('is empty for the coach’s own account ("View as customer") and with no account', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, rerender } = renderStudents(HERMAN)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
    rerender({ id: null })
    expect(result.current.data).toEqual([])
  })
})
