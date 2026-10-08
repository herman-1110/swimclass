import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { balanceKeys } from '@/entities/balance'
import { paymentKeys } from '@/entities/payment'
import { scheduleKeys } from '@/entities/schedule'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { demoDb } from '@/shared/api/demo/db'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { useAddFreeLesson } from './useAddFreeLesson'
import { useRecordPayment } from './useRecordPayment'
import { useRemovePayment } from './useRemovePayment'

// Demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00 MYT.
const HANA = 'c0000000-0000-4000-8000-000000000003'
const PRIYA = 'c0000000-0000-4000-8000-000000000005'

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
  return { result, invalidate }
}

const balanceOf = async (groupId: string) =>
  (await readRows('group_balance', { eq: { group_id: groupId } }))[0]

const refreshed = (invalidate: { mock: { calls: unknown[][] } }) =>
  invalidate.mock.calls.map(([filters]) => (filters as { queryKey: unknown }).queryKey)

describe('useRecordPayment', () => {
  it('lets the database price a payment with no amount, which it can’t without a price', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderMutation(() => useRecordPayment())
    act(() =>
      result.current.mutate({ groupId: HANA, lessons: 4, amountCents: null, method: 'cash' }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'price_not_set' })
    expect(await balanceOf(HANA)).toMatchObject({ paid_lessons: 20, unpaid: true })
  })

  it('saves a payment, then refreshes balances, payments and the week', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const onSaved = vi.fn()
    const { result, invalidate } = renderMutation(() => useRecordPayment({ onSaved }))
    act(() =>
      result.current.mutate({
        groupId: HANA,
        lessons: 4,
        amountCents: 24000,
        method: 'cash',
        paidOn: '2026-09-26',
        note: 'Paid at the pool',
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(refreshed(invalidate)).toEqual([balanceKeys.all, paymentKeys.all, scheduleKeys.all])
    expect(await balanceOf(HANA)).toMatchObject({
      paid_lessons: 24,
      unpaid: false,
      last_paid_on: '2026-09-26',
      last_payment_method: 'cash',
    })
  })

  it('passes the database’s refusals on: a date in the future', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderMutation(() => useRecordPayment())
    act(() =>
      result.current.mutate({
        groupId: PRIYA,
        lessons: 4,
        amountCents: 24000,
        method: 'transfer',
        paidOn: '2026-09-27',
      }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'invalid_date' })
  })

  it('is refused for a customer', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderMutation(() => useRecordPayment())
    act(() => result.current.mutate({ groupId: PRIYA, lessons: 4, amountCents: 0, method: 'cash' }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'not_coach' })
  })
})

describe('useAddFreeLesson', () => {
  it('adds a lesson at RM 0, dated today, and refreshes like a payment', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, invalidate } = renderMutation(() => useAddFreeLesson())
    act(() => result.current.mutate({ groupId: PRIYA, note: '  Makeup  ' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(refreshed(invalidate)).toEqual([balanceKeys.all, paymentKeys.all, scheduleKeys.all])
    const [latest] = await readRows('payments', {
      eq: { group_id: PRIYA },
      order: [{ column: 'created_at', ascending: false }],
      limit: 1,
    })
    expect(latest).toMatchObject({
      lessons: 1,
      amount_cents: 0,
      method: 'free',
      paid_on: '2026-09-26',
      note: 'Makeup',
    })
    expect(await balanceOf(PRIYA)).toMatchObject({ paid_lessons: 17, last_lesson_at: null })
  })

  it('refuses a note over 500 characters', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderMutation(() => useAddFreeLesson())
    act(() => result.current.mutate({ groupId: PRIYA, note: 'x'.repeat(501) }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'invalid_note' })
  })
})

describe('useRemovePayment', () => {
  /** Saves a payment for Hana as the coach and returns its id. */
  async function hanaPays() {
    await logIn('herman', DEMO_PASSWORD)
    return rpc('record_payment', {
      p_group_id: HANA,
      p_lessons: 4,
      p_amount_cents: 24000,
      p_method: 'transfer',
    })
  }

  it('removes a payment saved by mistake, then refreshes like a payment', async () => {
    const before = await balanceOf(HANA)
    const id = await hanaPays()
    const onRemoved = vi.fn()
    const { result, invalidate } = renderMutation(() => useRemovePayment({ onRemoved }))
    act(() => result.current.mutate({ paymentId: id }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onRemoved).toHaveBeenCalledWith('removed', { paymentId: id })
    expect(refreshed(invalidate)).toEqual([balanceKeys.all, paymentKeys.all, scheduleKeys.all])
    expect(await readRows('payments', { eq: { id } })).toEqual([])
    expect(await balanceOf(HANA)).toEqual(before)
  })

  it('takes one already removed (another tab) as removed', async () => {
    const id = await hanaPays()
    await rpc('remove_payment', { p_payment_id: id })
    const onRemoved = vi.fn()
    const { result } = renderMutation(() => useRemovePayment({ onRemoved }))
    act(() => result.current.mutate({ paymentId: id }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onRemoved).toHaveBeenCalledWith('already-removed', { paymentId: id })
  })

  it('keeps an online payment', async () => {
    const id = await hanaPays()
    const db = await demoDb()
    await db.query(`update public.payments set gateway_ref = 'fpx-test-1' where id = $1`, [id])
    const { result } = renderMutation(() => useRemovePayment())
    act(() => result.current.mutate({ paymentId: id }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'online_payment' })
    expect(await readRows('payments', { eq: { id } })).toHaveLength(1)
    // Hana can't pay further ahead: leave her as she was.
    await db.query('update public.payments set gateway_ref = null where id = $1', [id])
    await rpc('remove_payment', { p_payment_id: id })
  })

  it('is refused for a customer', async () => {
    const id = await hanaPays()
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderMutation(() => useRemovePayment())
    act(() => result.current.mutate({ paymentId: id }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'not_coach' })
    await logIn('herman', DEMO_PASSWORD)
    expect(await readRows('payments', { eq: { id } })).toHaveLength(1)
    await rpc('remove_payment', { p_payment_id: id })
  })
})
