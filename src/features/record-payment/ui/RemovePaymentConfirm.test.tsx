import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Payment } from '@/entities/payment'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { demoDb } from '@/shared/api/demo/db'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { RemovePaymentButton } from './RemovePaymentButton'
import { RemovePaymentConfirm } from './RemovePaymentConfirm'

// Demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00 MYT.
const PRIYA = 'c0000000-0000-4000-8000-000000000005'
const NOW = '2026-09-26T12:00:00+08:00'

const COLUMNS = [
  'id',
  'group_id',
  'lessons',
  'amount_cents',
  'method',
  'paid_on',
  'note',
  'created_at',
] as const

/** Priya pays RM 240 for 4 lessons in cash, saved as the coach. */
async function priyaPays(): Promise<Payment> {
  await logIn('herman', DEMO_PASSWORD)
  const id = await rpc('record_payment', {
    p_group_id: PRIYA,
    p_lessons: 4,
    p_amount_cents: 24000,
    p_method: 'cash',
  })
  const [payment] = await readRows('payments', { eq: { id }, columns: [...COLUMNS] })
  if (!payment) throw new Error('No payment')
  return payment
}

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function withClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

const free: Payment = {
  id: 'f0000000-0000-4000-8000-000000000001',
  group_id: PRIYA,
  lessons: 1,
  amount_cents: 0,
  method: 'free',
  paid_on: '2025-12-20',
  note: null,
  created_at: '2025-12-20T03:00:00Z',
}

describe('RemovePaymentButton', () => {
  it('is named for the payment, or the free lesson, with the year when it isn’t this one', () => {
    const payment = { ...free, method: 'cash' as const, lessons: 4, amount_cents: 24000 }
    const onClick = vi.fn()
    render(<RemovePaymentButton payment={payment} now={NOW} onClick={onClick} />)
    render(<RemovePaymentButton payment={free} now={NOW} onClick={vi.fn()} />)
    const remove = screen.getByRole('button', { name: 'Remove the RM 240 payment of 20 Dec 2025' })
    expect(remove.getAttribute('aria-haspopup')).toBe('dialog')
    fireEvent.click(remove)
    expect(onClick).toHaveBeenCalledOnce()
    screen.getByRole('button', { name: 'Remove the free lesson of 20 Dec 2025' })
  })
})

describe('RemovePaymentConfirm', () => {
  it('says what the payment was and what removing it changes, with focus on Keep payment', () => {
    const onClose = vi.fn()
    render(
      withClient(
        <RemovePaymentConfirm
          payment={{ ...free, method: 'transfer', lessons: 4, amount_cents: 24000 }}
          names="Aiman & Sofia"
          now={NOW}
          onClose={onClose}
          onRemoved={vi.fn()}
        />,
      ),
    )
    screen.getByRole('alertdialog', {
      name: 'Remove this payment?',
      description:
        'RM 240 · 4 lessons · 20 Dec 2025 · Transfer. This takes 4 lessons off Aiman & Sofia’s packages and the payment off their receipts. Nobody is emailed.',
    })
    const keep = screen.getByRole('button', { name: 'Keep payment' })
    expect(document.activeElement).toBe(keep)
    fireEvent.click(keep)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('reads a free lesson as one', () => {
    render(
      withClient(
        <RemovePaymentConfirm
          payment={free}
          names="Hana"
          now={NOW}
          onClose={vi.fn()}
          onRemoved={vi.fn()}
        />,
      ),
    )
    screen.getByRole('alertdialog', {
      name: 'Remove this payment?',
      description:
        'Free · 1 lesson · 20 Dec 2025. This takes 1 lesson off Hana’s packages and the payment off their receipts. Nobody is emailed.',
    })
  })

  it('removes the payment and says so', async () => {
    const payment = await priyaPays()
    const onRemoved = vi.fn()
    render(
      withClient(
        <RemovePaymentConfirm
          payment={payment}
          names="Priya"
          now={NOW}
          onClose={vi.fn()}
          onRemoved={onRemoved}
        />,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove payment' }))
    await waitFor(() => expect(onRemoved).toHaveBeenCalledWith('Payment removed.'))
    expect(await readRows('payments', { eq: { id: payment.id } })).toEqual([])
  })

  it('says so when another tab removed it first', async () => {
    const payment = await priyaPays()
    await rpc('remove_payment', { p_payment_id: payment.id })
    const onRemoved = vi.fn()
    render(
      withClient(
        <RemovePaymentConfirm
          payment={payment}
          names="Priya"
          now={NOW}
          onClose={vi.fn()}
          onRemoved={onRemoved}
        />,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove payment' }))
    await waitFor(() => expect(onRemoved).toHaveBeenCalledWith('This payment was already removed.'))
  })

  it('keeps an online payment, in words, with nothing to try again', async () => {
    const payment = await priyaPays()
    const db = await demoDb()
    await db.query(`update public.payments set gateway_ref = 'fpx-test-2' where id = $1`, [
      payment.id,
    ])
    const onRemoved = vi.fn()
    render(
      withClient(
        <RemovePaymentConfirm
          payment={payment}
          names="Priya"
          now={NOW}
          onClose={vi.fn()}
          onRemoved={onRemoved}
        />,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove payment' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'This payment was made online, so it can’t be removed here.',
    )
    expect(screen.queryByRole('button', { name: 'Remove payment' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
    expect(onRemoved).not.toHaveBeenCalled()
    expect(await readRows('payments', { eq: { id: payment.id } })).toHaveLength(1)
  })
})
