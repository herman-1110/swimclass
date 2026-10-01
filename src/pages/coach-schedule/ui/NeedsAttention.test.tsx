import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { getBackend } from '@/shared/api/backend'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { NeedsAttention } from './NeedsAttention'

// Runs in demo mode: the real migrations and seed in PGlite, as herman. The seed flags Hana
// and Wei Jie (unpaid), Priya and Sofia (last paid lesson), and has no waiting accounts.

const SLOW = { timeout: 4000 }

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  await logIn('herman', DEMO_PASSWORD)
}, 60_000)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([
    { path: '/', element: <NeedsAttention onApproved={() => {}} /> },
  ])
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return screen.getByRole('region', { name: 'Needs attention' })
}

describe('NeedsAttention', () => {
  it('says why when the balances can’t be read, and “Try again” hands focus to the rows', async () => {
    const backend = await getBackend()
    const read = backend.read.bind(backend)
    let lost = true
    vi.spyOn(backend, 'read').mockImplementation((source, query) =>
      lost && source === 'group_balance'
        ? Promise.reject(new TypeError('Failed to fetch'))
        : read(source, query),
    )
    const section = renderSection()
    const alert = await within(section).findByRole('alert', {}, SLOW)
    expect(alert.textContent).toBe(
      'Couldn’t reach the server. Check your connection and try again.Try again',
    )
    lost = false
    const retry = within(alert).getByRole('button', { name: 'Try again' })
    retry.focus()
    fireEvent.click(retry)
    const rows = await within(section).findAllByRole('listitem', {}, SLOW)
    expect(rows.map((row) => row.textContent?.split(' ')[0])).toEqual([
      'Hana',
      'Wei',
      'Priya',
      'Sofia',
    ])
    // Not dropped to the page with the button: the section the rows are in has it.
    expect(document.activeElement).toBe(section)
  })

  it('says so when nothing needs attention (§6.2)', async () => {
    // Every flagged group pays for a package, until none owes or is on its last paid lesson.
    for (let round = 0; round < 3; round += 1) {
      const flagged = (await readRows('group_balance')).filter(
        (balance) => balance.unpaid || balance.last_lesson_at !== null,
      )
      for (const { group_id: groupId, package_size: size } of flagged) {
        if (groupId === null || size === null) continue
        await rpc('record_payment', {
          p_group_id: groupId,
          p_lessons: size,
          p_amount_cents: 24000,
          p_method: 'cash',
        })
      }
    }
    const section = renderSection()
    expect(await within(section).findByText('Nothing needs your attention.', {}, SLOW)).toBeTruthy()
    await waitFor(() => expect(within(section).queryByRole('list')).toBeNull())
  })
})
