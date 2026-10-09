import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { DeleteGroupButton } from './DeleteGroupButton'
import { DeleteGroupDialog } from './DeleteGroupDialog'

// Demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00 MYT.
const AIMAN_SOFIA = {
  group_id: 'c0000000-0000-4000-8000-000000000001',
  display_names: 'Aiman & Sofia',
  type_label: '1-to-2',
} as const

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

describe('DeleteGroupButton', () => {
  it('opens the confirmation, which says what goes and that the account stays', () => {
    render(
      withClient(
        <DeleteGroupButton group={AIMAN_SOFIA} accountName="Mei Ling" onDeleted={vi.fn()} />,
      ),
    )
    const button = screen.getByRole('button', { name: 'Delete group' })
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    fireEvent.click(button)
    screen.getByRole('alertdialog', {
      name: 'Delete Aiman & Sofia’s 1-to-2 group?',
      description:
        'It goes from Students & payments with its payments, lessons and starting balance. Mei Ling’s account stays. Nobody is emailed. This can’t be undone.',
    })
    const keep = screen.getByRole('button', { name: 'Keep group' })
    expect(document.activeElement).toBe(keep)
    fireEvent.click(keep)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})

describe('DeleteGroupDialog', () => {
  it('shows the refusal while the group has lessons ahead; only Close is left, with focus', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const onDeleted = vi.fn()
    const onClose = vi.fn()
    render(
      withClient(
        <DeleteGroupDialog
          group={AIMAN_SOFIA}
          accountName="Mei Ling"
          onClose={onClose}
          onDeleted={onDeleted}
        />,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete group' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(
      'This group has 2 upcoming lessons. Cancel them first, then delete the group. Each cancellation emails the customer.',
    )
    expect(screen.queryByRole('button', { name: 'Delete group' })).toBeNull()
    const close = screen.getByRole('button', { name: 'Close' })
    await waitFor(() => expect(document.activeElement).toBe(close))
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledOnce()
    expect(onDeleted).not.toHaveBeenCalled()
  })
})
