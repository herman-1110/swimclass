import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { AddFreeLesson } from './AddFreeLesson'

// Demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00 MYT.
const HANA = 'c0000000-0000-4000-8000-000000000003'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderBlock() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onAdded = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <AddFreeLesson groupId={HANA} names="Hana" onAdded={onAdded} />
    </QueryClientProvider>,
  )
  const trigger = screen.getByRole('button', { name: 'Add a free lesson' })
  fireEvent.click(trigger)
  return { trigger, onAdded }
}

const add = () => screen.getByRole('button', { name: /^(Add 1 free lesson|Free lesson added)$/ })

describe('AddFreeLesson', () => {
  it('opens a block that says what it does, with an optional note', () => {
    const { trigger } = renderBlock()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const block = document.getElementById(trigger.getAttribute('aria-controls') ?? '')
    expect(block?.textContent).toContain('Adds 1 lesson at RM 0 to Hana’s package, dated today.')
    expect(screen.getByLabelText('Note (optional)')).toBeTruthy()
    expect(add().textContent).toBe('Add 1 free lesson')
    // The line that says what the button does is read out with it.
    expect(
      screen.getByRole('button', {
        name: 'Add 1 free lesson',
        description: 'Adds 1 lesson at RM 0 to Hana’s package, dated today.',
      }),
    ).toBeTruthy()
  })

  it('adds the lesson, then reads "Free lesson added" until the note changes', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { onAdded } = renderBlock()
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'Makeup' } })
    fireEvent.click(add())
    await waitFor(() => expect(add().textContent).toBe('Free lesson added'))
    expect(onAdded).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status').textContent).toBe('Free lesson added.')
    expect(add().getAttribute('aria-disabled')).toBe('true')
    const [latest] = await readRows('payments', {
      eq: { group_id: HANA, method: 'free' },
      columns: ['lessons', 'amount_cents', 'note'],
    })
    expect(latest).toEqual({ lessons: 1, amount_cents: 0, note: 'Makeup' })
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'Again' } })
    expect(add().textContent).toBe('Add 1 free lesson')
  })

  it('shows a note that is too long at the note', async () => {
    await logIn('herman', DEMO_PASSWORD)
    renderBlock()
    const note = screen.getByLabelText('Note (optional)')
    fireEvent.change(note, { target: { value: 'x'.repeat(501) } })
    fireEvent.click(add())
    await waitFor(() => expect(note.getAttribute('aria-invalid')).toBe('true'))
    expect(document.getElementById(`${note.id}-error`)?.textContent).toBe(
      'The note is too long. Shorten it to 500 characters.',
    )
    expect(document.activeElement).toBe(note)
  })

  it('closes on Cancel, with focus back on "Add a free lesson"', () => {
    const { trigger } = renderBlock()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByLabelText('Note (optional)')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})
