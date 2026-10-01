import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { accountKeys } from '@/entities/account'
import { balanceKeys } from '@/entities/balance'
import { groupKeys } from '@/entities/group'
import { paymentKeys } from '@/entities/payment'
import { settingsKeys } from '@/entities/settings'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { AppError, readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { type CreateGroupInput, useCreateGroup } from './useCreateGroup'

// Runs in demo mode: the real create_group in PGlite, signed in as the coach. Each test adds
// to the same database, so each one uses its own account or names.

const MEILING = 'a0000000-0000-4000-8000-000000000002'
const FARAH = 'a0000000-0000-4000-8000-000000000003'
const ZULAIKHA = 'a0000000-0000-4000-8000-000000000006'
const GRACE = 'a0000000-0000-4000-8000-000000000008'
const AIMAN = 'b0000000-0000-4000-8000-000000000001'
const HANA = 'b0000000-0000-4000-8000-000000000003'
const [ADAM, ALYA, AMIR] = ['06', '07', '08'].map((n) => `b0000000-0000-4000-8000-0000000000${n}`)

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderCreateGroup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useCreateGroup(), { wrapper })
  const refreshed = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey)
  return { result, refreshed }
}

function input(overrides: Partial<CreateGroupInput>): CreateGroupInput {
  return {
    accountId: ZULAIKHA,
    students: [],
    location: 'Maple Condo',
    firstPackagePaid: false,
    amountCents: null,
    method: null,
    openingUsed: 0,
    openingPaid: 0,
    ...overrides,
  }
}

async function failure(run: () => Promise<unknown>): Promise<AppError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AppError) return error
    throw error
  }
  throw new Error('Expected the call to fail')
}

describe('useCreateGroup', () => {
  it('adds a group of new students and refreshes groups, balances and students (scenario 2)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, refreshed } = renderCreateGroup()
    let groupId = ''
    await act(async () => {
      groupId = await result.current.mutateAsync(
        input({ students: [{ name: 'Hakim' }, { name: ' Iman ' }, { name: 'Zara' }] }),
      )
    })
    const [group] = await readRows('group_details', { eq: { group_id: groupId } })
    expect(group).toMatchObject({
      account_id: ZULAIKHA,
      display_names: 'Hakim, Iman & Zara',
      type_label: '1-to-3',
      location: 'Maple Condo',
    })
    const [balance] = await readRows('group_balance', { eq: { group_id: groupId } })
    expect(balance).toMatchObject({ package_no: 1, left_in_package: 4, unpaid: false })
    expect(refreshed()).toEqual([groupKeys.all, balanceKeys.all, accountKeys.all])
  })

  it('records the first package when it is paid, and refreshes payments too (scenario 6)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, refreshed } = renderCreateGroup()
    let groupId = ''
    await act(async () => {
      groupId = await result.current.mutateAsync(
        input({
          accountId: FARAH,
          students: [{ student_id: HANA }, { name: 'Hadi' }],
          location: 'Sunrise Res.',
          firstPackagePaid: true,
          amountCents: 0,
          method: 'cash',
        }),
      )
    })
    const [group] = await readRows('group_details', { eq: { group_id: groupId } })
    expect(group?.display_names).toBe('Hadi & Hana')
    const payments = await readRows('payments', { eq: { group_id: groupId } })
    expect(payments).toMatchObject([
      { lessons: 4, amount_cents: 0, method: 'cash', paid_on: '2026-09-26' },
    ])
    const [balance] = await readRows('group_balance', { eq: { group_id: groupId } })
    expect(balance).toMatchObject({ paid_lessons: 4, can_still_book: 8 })
    expect(refreshed()).toEqual([groupKeys.all, balanceKeys.all, accountKeys.all, paymentKeys.all])
  })

  it('sends the starting balance (scenario 8)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderCreateGroup()
    let groupId = ''
    await act(async () => {
      groupId = await result.current.mutateAsync(
        input({
          accountId: MEILING,
          students: [{ student_id: AIMAN }],
          location: 'Palm Court',
          firstPackagePaid: true,
          amountCents: 30000,
          method: 'transfer',
          openingUsed: 2,
          openingPaid: 3,
        }),
      )
    })
    const [balance] = await readRows('group_balance', { eq: { group_id: groupId } })
    expect(balance).toMatchObject({
      paid_lessons: 7,
      used_lessons: 2,
      used_in_package: 2,
      can_still_book: 9,
      last_payment_method: 'transfer',
    })
  })

  it('answers duplicate_group for the same existing students, with that group (scenario 1)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, refreshed } = renderCreateGroup()
    const error = await failure(() =>
      act(() =>
        result.current.mutateAsync(
          input({ students: [{ student_id: ADAM }, { student_id: ALYA }, { student_id: AMIR }] }),
        ),
      ),
    )
    expect(error.code).toBe('duplicate_group')
    expect(error.detail).toEqual({ group_id: 'c0000000-0000-4000-8000-000000000006' })
    expect(refreshed()).toEqual([])
  })

  it('refreshes the students after a refusal that means they changed', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, refreshed } = renderCreateGroup()
    // Hana is farah's student, not grace's.
    const error = await failure(() =>
      act(() =>
        result.current.mutateAsync(
          input({ accountId: GRACE, students: [{ name: 'Ella' }, { student_id: HANA }] }),
        ),
      ),
    )
    expect(error.code).toBe('student_other_account')
    expect(error.detail).toEqual({ index: 2 })
    expect(refreshed()).toEqual([accountKeys.all])
  })

  it('refreshes the settings after group_full', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result, refreshed } = renderCreateGroup()
    const error = await failure(() =>
      act(() =>
        result.current.mutateAsync(
          input({ students: ['A', 'B', 'C', 'D'].map((name) => ({ name })) }),
        ),
      ),
    )
    expect(error).toMatchObject({ code: 'group_full', detail: { max: 3 } })
    expect(refreshed()).toEqual([settingsKeys.all])
  })

  it('stops at price_not_set when paid with no amount and no price (scenario 7)', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { result } = renderCreateGroup()
    const error = await failure(() =>
      act(() =>
        result.current.mutateAsync(
          input({
            accountId: GRACE,
            students: [{ name: 'Nobody' }],
            firstPackagePaid: true,
            method: 'cash',
          }),
        ),
      ),
    )
    expect(error.code).toBe('price_not_set')
    // It fails as a whole: no student is left behind.
    const students = await readRows('students', { eq: { account_id: GRACE, name: 'Nobody' } })
    expect(students).toEqual([])
  })

  it('is refused for a customer', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { result } = renderCreateGroup()
    const error = await failure(() =>
      act(() =>
        result.current.mutateAsync(input({ accountId: MEILING, students: [{ name: 'Mia' }] })),
      ),
    )
    expect(error.code).toBe('not_coach')
  })
})
