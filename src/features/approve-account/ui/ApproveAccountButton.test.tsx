import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { accountKeys } from '@/entities/account'
import { getSession, logIn, logOut, signUp } from '@/shared/api/auth'
import { readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { ApproveAccountButton } from './ApproveAccountButton'

// Runs in demo mode: the real migrations and seed in PGlite. The seed has no waiting
// accounts, so the tests sign one up.

let siti = { id: '', display_name: 'Siti Rahman' }

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  await signUp({
    username: 'siti',
    displayName: 'Siti Rahman',
    email: 'siti@example.com',
    phone: null,
    password: DEMO_PASSWORD,
  })
  const session = await logIn('siti', DEMO_PASSWORD)
  siti = { ...siti, id: session.userId }
}, 60_000)

afterEach(cleanup)

function renderButton(look?: 'link' | 'compact') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const onApproved = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <ApproveAccountButton account={siti} look={look} onApproved={onApproved} />
    </QueryClientProvider>,
  )
  return { invalidate, onApproved }
}

describe('ApproveAccountButton', () => {
  it('is named for the account, looking like the row’s other action', () => {
    renderButton()
    const link = screen.getByRole('button', { name: 'Approve Siti Rahman' })
    expect(link.textContent).toBe('Approve Siti Rahman')
    expect(link.className).toContain('text-accent')
    expect(link.className).toContain('text-label')
    cleanup()
    renderButton('compact')
    const compact = screen.getByRole('button', { name: 'Approve Siti Rahman' })
    expect(compact.className).toContain('bg-accent')
    expect(compact.className).toContain('rounded-small')
  })

  it('says why when it can’t approve, and keeps the account waiting', async () => {
    await logIn('meiling', DEMO_PASSWORD)
    const { onApproved } = renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Approve Siti Rahman' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Something went wrong. Refresh the page and try again.')
    expect(
      screen.getByRole('button', {
        name: 'Approve Siti Rahman',
        description: 'Something went wrong. Refresh the page and try again.',
      }),
    ).toBeTruthy()
    expect(onApproved).not.toHaveBeenCalled()
  })

  it('approves at once, announces it and refreshes the accounts', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { invalidate, onApproved } = renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Approve Siti Rahman' }))
    await waitFor(() => expect(onApproved).toHaveBeenCalledWith('Siti Rahman approved'))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: accountKeys.all }))
    const [profile] = await readRows('profiles', { eq: { id: siti.id } })
    expect(profile?.approved).toBe(true)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
