import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import type { PriceSettings } from '../model/paymentForm'
import { RecordPaymentForm } from './RecordPaymentForm'

// Demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00 MYT.
const HANA = {
  group_id: 'c0000000-0000-4000-8000-000000000003',
  size: 1,
  type_label: '1-to-1',
} as const
const NO_PRICES: PriceSettings = {
  price_1to1_cents: null,
  price_1to2_cents: null,
  price_1to3_cents: null,
  lessons_per_package: 4,
}
const PRICE_NOT_SET =
  'No price is set for this lesson type. Type the amount, or set the price in Settings.'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderForm({
  group = HANA,
  settings = NO_PRICES,
}: {
  group?: typeof HANA | { group_id: string; size: 1; type_label: '1-to-1' }
  settings?: PriceSettings
} = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onCancel = vi.fn()
  const onSaved = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <RecordPaymentForm
        group={group}
        balance={{ package_size: 4, paid_lessons: 20 }}
        settings={settings}
        accountName="Farah"
        today="2026-09-26"
        onCancel={onCancel}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  )
  return { onCancel, onSaved }
}

const amount = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Amount (RM)' })
const save = () => screen.getByRole('button', { name: /^(Save payment|Payment saved)$/ })
const errorOf = (field: HTMLElement) =>
  field
    .getAttribute('aria-describedby')
    ?.split(' ')
    .map((id) => document.getElementById(id)?.textContent)

describe('RecordPaymentForm', () => {
  it('starts as drawn: the next package, no amount without a price, Cash, today', () => {
    renderForm()
    const pkg = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Package' })
    expect(pkg.value).toBe('package')
    expect(
      within(pkg)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['1-to-1 · Package 6 · 4 lessons', 'Custom number of lessons'])
    expect(amount().value).toBe('')
    expect(amount().getAttribute('inputmode')).toBe('decimal')
    expect(errorOf(amount())).toContain(PRICE_NOT_SET)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Cash' }).checked).toBe(true)
    const date = screen.getByLabelText<HTMLInputElement>('Date paid')
    expect(date.value).toBe('2026-09-26')
    expect(date.max).toBe('2026-09-26')
    expect(screen.getByLabelText('Note (optional)').getAttribute('placeholder')).toBe(
      'e.g. Paid by Farah at the pool',
    )
  })

  it('prefills the amount from the price for the lessons, until the coach types one', () => {
    renderForm({ settings: { ...NO_PRICES, price_1to1_cents: 24000 } })
    expect(amount().value).toBe('240')
    expect(screen.queryByText(PRICE_NOT_SET)).toBeNull()
    fireEvent.change(screen.getByRole('combobox', { name: 'Package' }), {
      target: { value: 'custom' },
    })
    const lessons = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Number of lessons' })
    expect(lessons.value).toBe('4')
    fireEvent.change(lessons, { target: { value: '2' } })
    expect(amount().value).toBe('120')
    fireEvent.change(amount(), { target: { value: '100' } })
    fireEvent.change(lessons, { target: { value: '3' } })
    expect(amount().value).toBe('100')
  })

  it('says an amount it can’t read before sending anything, at the amount', () => {
    renderForm()
    fireEvent.change(amount(), { target: { value: '240.505' } })
    fireEvent.click(save())
    expect(amount().getAttribute('aria-invalid')).toBe('true')
    expect(errorOf(amount())).toContain('Enter the amount in RM, like 240 or 240.50.')
    expect(document.activeElement).toBe(amount())
  })

  it('shows the database’s refusals under their field, with focus there', async () => {
    await logIn('herman', DEMO_PASSWORD)
    renderForm()
    fireEvent.click(save())
    await waitFor(() => expect(amount().getAttribute('aria-invalid')).toBe('true'))
    expect(errorOf(amount())).toEqual([PRICE_NOT_SET])
    expect(document.activeElement).toBe(amount())

    const date = screen.getByLabelText('Date paid')
    fireEvent.change(amount(), { target: { value: '240' } })
    fireEvent.change(date, { target: { value: '2026-09-27' } })
    fireEvent.click(save())
    await waitFor(() => expect(date.getAttribute('aria-invalid')).toBe('true'))
    expect(errorOf(date)).toContain(
      'The payment date is in the future. Pick today or an earlier date.',
    )
    expect(document.activeElement).toBe(date)
  })

  it('shows refused lessons, a negative amount and a long note at their fields', async () => {
    await logIn('herman', DEMO_PASSWORD)
    renderForm()
    fireEvent.change(screen.getByRole('combobox', { name: 'Package' }), {
      target: { value: 'custom' },
    })
    const lessons = screen.getByRole('spinbutton', { name: 'Number of lessons' })
    fireEvent.change(lessons, { target: { value: '0' } })
    fireEvent.change(amount(), { target: { value: '240' } })
    fireEvent.click(save())
    await waitFor(() => expect(lessons.getAttribute('aria-invalid')).toBe('true'))
    expect(errorOf(lessons)).toContain(
      'A payment needs at least 1 lesson. Change the number of lessons.',
    )
    expect(document.activeElement).toBe(lessons)

    fireEvent.change(lessons, { target: { value: '4' } })
    fireEvent.change(amount(), { target: { value: '-1' } })
    fireEvent.click(save())
    await waitFor(() => expect(amount().getAttribute('aria-invalid')).toBe('true'))
    expect(errorOf(amount())).toContain('The amount can’t be negative. Enter RM 0 or more.')

    const note = screen.getByLabelText('Note (optional)')
    fireEvent.change(amount(), { target: { value: '240' } })
    fireEvent.change(note, { target: { value: 'x'.repeat(501) } })
    fireEvent.click(save())
    await waitFor(() => expect(note.getAttribute('aria-invalid')).toBe('true'))
    expect(errorOf(note)).toContain('The note is too long. Shorten it to 500 characters.')
    expect(document.activeElement).toBe(note)
  })

  it('shows other refusals above the buttons', async () => {
    await logIn('herman', DEMO_PASSWORD)
    renderForm({
      group: { group_id: 'c0000000-0000-4000-8000-000000000099', size: 1, type_label: '1-to-1' },
    })
    fireEvent.change(amount(), { target: { value: '240' } })
    fireEvent.click(save())
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Something went wrong. Refresh the page and try again.',
    )
  })

  it('saves, says "Payment saved" until anything changes, and starts afresh', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { onSaved } = renderForm()
    fireEvent.change(amount(), { target: { value: '240' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Transfer' }))
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'At the pool' } })
    fireEvent.click(save())
    await waitFor(() => expect(save().textContent).toBe('Payment saved'))
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(save().getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('status').textContent).toBe('Payment saved')
    expect(amount().value).toBe('')
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Cash' }).checked).toBe(true)
    fireEvent.change(amount(), { target: { value: '1' } })
    expect(save().textContent).toBe('Save payment')
    expect(save().getAttribute('aria-disabled')).toBeNull()
  })

  it('resets on Cancel, then tells the panel', () => {
    const { onCancel } = renderForm()
    fireEvent.change(amount(), { target: { value: '99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(amount().value).toBe('')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
