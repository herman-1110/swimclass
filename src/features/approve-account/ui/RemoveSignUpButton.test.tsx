import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { REMOVE_SIGN_UP_AVAILABLE } from '../api/useRemoveSignUp'
import { RemoveSignUpButton } from './RemoveSignUpButton'
import { RemoveSignUpConfirm } from './RemoveSignUpConfirm'

// Runs in demo mode. admin-accounts' delete_account doesn't exist yet (prompt 09): demo
// mode answers `unknown`, like the real function would before it is built.

const SITI = {
  id: 'f0000000-0000-4000-8000-000000000001',
  display_name: 'Siti Rahman',
  username: 'siti',
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

describe('RemoveSignUpButton', () => {
  it('renders nothing until admin-accounts can delete a sign-up', () => {
    expect(REMOVE_SIGN_UP_AVAILABLE).toBe(false)
    const { container } = render(withClient(<RemoveSignUpButton account={SITI} />))
    expect(container.innerHTML).toBe('')
  })
})

describe('RemoveSignUpConfirm (behind RemoveSignUpButton once delete_account exists)', () => {
  it('asks first, naming the account, with focus on Cancel', () => {
    const onClose = vi.fn()
    render(withClient(<RemoveSignUpConfirm account={SITI} onClose={onClose} onRemoved={vi.fn()} />))
    screen.getByRole('alertdialog', {
      name: 'Remove Siti Rahman’s sign-up?',
      description: 'This deletes the account siti. They can sign up again.',
    })
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(document.activeElement).toBe(cancel)
    fireEvent.click(cancel)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('gives the generic message while delete_account doesn’t exist', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const onRemoved = vi.fn()
    render(
      withClient(<RemoveSignUpConfirm account={SITI} onClose={vi.fn()} onRemoved={onRemoved} />),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove sign-up' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Something went wrong. Refresh the page and try again.',
    )
    expect(screen.queryByRole('button', { name: 'Remove sign-up' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
    expect(onRemoved).not.toHaveBeenCalled()
  })
})
