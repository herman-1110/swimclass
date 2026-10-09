import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { accountKeys } from '@/entities/account'
import { balanceKeys } from '@/entities/balance'
import { bookingKeys } from '@/entities/booking'
import { groupKeys } from '@/entities/group'
import { paymentKeys } from '@/entities/payment'
import { scheduleKeys } from '@/entities/schedule'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { useDeleteGroup } from './useDeleteGroup'
import { useSetGroupActive } from './useSetGroupActive'
import { useUpdateGroup } from './useUpdateGroup'

// Demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00 MYT.
const HANA = 'c0000000-0000-4000-8000-000000000003'
const ZULAIKHA = 'a0000000-0000-4000-8000-000000000006'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderMutation<T>(useHook: () => T) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(useHook, { wrapper })
  const refreshed = () =>
    invalidate.mock.calls.map(([filters]) => (filters as { queryKey: unknown }).queryKey)
  return { result, refreshed }
}

const groupOf = async (groupId: string) =>
  (await readRows('group_details', { eq: { group_id: groupId } }))[0]

describe('useUpdateGroup', () => {
  it('moves the group and its upcoming lessons to a new pool, and refreshes what that changes', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, refreshed } = renderMutation(() => useUpdateGroup())
    act(() => result.current.mutate({ groupId: HANA, location: 'Sunrise Residence' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(refreshed()).toEqual([groupKeys.all, balanceKeys.all, bookingKeys.all, scheduleKeys.all])
    expect(await groupOf(HANA)).toMatchObject({
      location: 'Sunrise Residence',
      opening_used_lessons: 20,
      opening_paid_lessons: 16,
    })
    const upcoming = await readRows('bookings', {
      eq: { group_id: HANA, status: 'booked' },
      columns: ['location'],
    })
    expect(upcoming.map((lesson) => lesson.location)).toEqual([
      'Sunrise Residence',
      'Sunrise Residence',
    ])
  })

  it('changes only the starting balance it is given', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderMutation(() => useUpdateGroup())
    act(() => result.current.mutate({ groupId: HANA, openingPaid: 17 }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(await groupOf(HANA)).toMatchObject({
      location: 'Sunrise Residence',
      opening_used_lessons: 20,
      opening_paid_lessons: 17,
    })
  })

  it('is refused a blank pool', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderMutation(() => useUpdateGroup())
    act(() => result.current.mutate({ groupId: HANA, location: '' }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'invalid_location' })
  })
})

describe('useSetGroupActive', () => {
  it('is refused while the group has lessons ahead, saying how many', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderMutation(() => useSetGroupActive())
    act(() => result.current.mutate({ groupId: HANA, active: false }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({
      code: 'has_upcoming_lessons',
      detail: { count: 2 },
    })
  })

  it('deactivates a group with nothing ahead and reactivates it, refreshing what that changes', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const groupId = await rpc('create_group', {
      p_account_id: ZULAIKHA,
      p_students: [{ name: 'Hakim' }],
      p_location: 'Maple Condo',
    })
    const off = renderMutation(() => useSetGroupActive())
    act(() => off.result.current.mutate({ groupId, active: false }))
    await waitFor(() => expect(off.result.current.isSuccess).toBe(true))
    expect(off.refreshed()).toEqual([groupKeys.all, balanceKeys.all, scheduleKeys.all])
    expect(await groupOf(groupId)).toMatchObject({ active: false })

    const on = renderMutation(() => useSetGroupActive())
    act(() => on.result.current.mutate({ groupId, active: true }))
    await waitFor(() => expect(on.result.current.isSuccess).toBe(true))
    expect(await groupOf(groupId)).toMatchObject({ active: true })
  })

  it('won’t reactivate a group whose students have another active group', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const first = await rpc('create_group', {
      p_account_id: ZULAIKHA,
      p_students: [{ name: 'Iman' }],
      p_location: 'Maple Condo',
    })
    await rpc('set_group_active', { p_group_id: first, p_active: false })
    const [iman] = (await groupOf(first))?.student_ids ?? []
    const second = await rpc('create_group', {
      p_account_id: ZULAIKHA,
      p_students: [{ student_id: iman }],
      p_location: 'Maple Condo',
    })
    const { result } = renderMutation(() => useSetGroupActive())
    act(() => result.current.mutate({ groupId: first, active: true }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({
      code: 'duplicate_group',
      detail: { group_id: second },
    })
  })
})

describe('useDeleteGroup', () => {
  it('is refused while the group has lessons ahead, saying how many', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderMutation(() => useDeleteGroup())
    act(() => result.current.mutate({ groupId: HANA }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({
      code: 'group_has_upcoming_lessons',
      detail: { count: 2 },
    })
    expect(await groupOf(HANA)).toBeDefined()
  })

  it('deletes a group added by mistake with its new student, says so first, then refreshes', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const groupId = await rpc('create_group', {
      p_account_id: ZULAIKHA,
      p_students: [{ name: 'Yusuf' }],
      p_location: 'Maple Condo',
      p_first_package_paid: true,
      p_amount_cents: 24000,
      p_method: 'cash',
    })
    const [yusuf] = (await groupOf(groupId))?.student_ids ?? []
    const onDeleted = vi.fn()
    const { result, refreshed } = renderMutation(() => useDeleteGroup({ onDeleted }))
    act(() => result.current.mutate({ groupId }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onDeleted).toHaveBeenCalledWith({ groupId })
    expect(refreshed()).toEqual([
      groupKeys.all,
      balanceKeys.all,
      bookingKeys.all,
      paymentKeys.all,
      scheduleKeys.all,
      accountKeys.students(),
    ])
    expect(await groupOf(groupId)).toBeUndefined()
    expect(await readRows('payments', { eq: { group_id: groupId } })).toEqual([])
    expect(await readRows('students', { eq: { id: yusuf ?? '' } })).toEqual([])
  })
})
