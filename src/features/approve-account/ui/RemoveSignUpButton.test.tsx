import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut, signUp } from '@/shared/api/auth'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { RemoveSignUpButton } from './RemoveSignUpButton'
import { RemoveSignUpConfirm } from './RemoveSignUpConfirm'

// Runs in demo mode: the real migrations and seed in PGlite, and demo mode's stand-in for
// admin-accounts' delete_account (the same refusals as the real one).

const MEILING = 'a0000000-0000-4000-8000-000000000002'

/** Signs up a waiting account and returns it (signed out afterwards). */
async function signUpWaiting(username: string, displayName: string) {
  await signUp({
    username,
    displayName,
    email: `${username}@example.com`,
    phone: null,
    password: DEMO_PASSWORD,
  })
  const session = await logIn(username, DEMO_PASSWORD)
  await logOut()
  return { id: session.userId, display_name: displayName, username }
}

let siti = { id: '', display_name: 'Siti Rahman', username: 'siti' }

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
  siti = await signUpWaiting('siti', 'Siti Rahman')
}, 60_000)

afterEach(cleanup)

function withClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('RemoveSignUpButton', () => {
  it('is named for the sign-up and opens the confirmation', () => {
    render(withClient(<RemoveSignUpButton account={siti} />))
    const remove = screen.getByRole('button', { name: 'Remove Siti Rahman’s sign-up' })
    expect(remove.getAttribute('aria-haspopup')).toBe('dialog')
    fireEvent.click(remove)
    screen.getByRole('alertdialog', { name: 'Remove Siti Rahman’s sign-up?' })
  })
})

describe('RemoveSignUpConfirm', () => {
  it('asks first, naming the account, with focus on Cancel', () => {
    const onClose = vi.fn()
    render(withClient(<RemoveSignUpConfirm account={siti} onClose={onClose} onRemoved={vi.fn()} />))
    screen.getByRole('alertdialog', {
      name: 'Remove Siti Rahman’s sign-up?',
      description: 'This deletes the account siti. They can sign up again.',
    })
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(document.activeElement).toBe(cancel)
    fireEvent.click(cancel)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('deletes the sign-up and says so', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const onRemoved = vi.fn()
    render(
      withClient(<RemoveSignUpConfirm account={siti} onClose={vi.fn()} onRemoved={onRemoved} />),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove sign-up' }))
    await waitFor(() => expect(onRemoved).toHaveBeenCalledWith('Sign-up removed.'))
    expect(await readRows('profiles', { eq: { id: siti.id } })).toEqual([])
    expect((await rpc('pending_accounts')).map((a) => a.username)).not.toContain('siti')
  })

  it('refuses an approved account, in words', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const meiling = { id: MEILING, display_name: 'Mei Ling', username: 'meiling' }
    const onRemoved = vi.fn()
    render(
      withClient(<RemoveSignUpConfirm account={meiling} onClose={vi.fn()} onRemoved={onRemoved} />),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove sign-up' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'This account is already approved, so it can’t be removed. Refresh to see the latest.',
    )
    // Nothing to try again: "Cancel" reads "Close" and has focus.
    expect(screen.queryByRole('button', { name: 'Remove sign-up' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
    expect(onRemoved).not.toHaveBeenCalled()
    expect(await readRows('profiles', { eq: { id: MEILING } })).toHaveLength(1)
  })

  it('refuses an account with a group, in words', async () => {
    const adam = await signUpWaiting('adam.w', 'Adam Wong')
    await logIn('herman', DEMO_PASSWORD)
    await rpc('create_group', {
      p_account_id: adam.id,
      p_students: [{ name: 'Adam' }],
      p_location: 'Palm Court',
    })
    render(withClient(<RemoveSignUpConfirm account={adam} onClose={vi.fn()} onRemoved={vi.fn()} />))
    fireEvent.click(screen.getByRole('button', { name: 'Remove sign-up' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'This account has a group of students, so it can’t be removed. Approve it instead.',
    )
    expect(await readRows('profiles', { eq: { id: adam.id } })).toHaveLength(1)
  })

  it('is the coach’s alone', async () => {
    const nina = await signUpWaiting('nina', 'Nina')
    await logIn('meiling', DEMO_PASSWORD)
    render(withClient(<RemoveSignUpConfirm account={nina} onClose={vi.fn()} onRemoved={vi.fn()} />))
    fireEvent.click(screen.getByRole('button', { name: 'Remove sign-up' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Something went wrong. Refresh the page and try again.',
    )
    await logIn('herman', DEMO_PASSWORD)
    expect((await rpc('pending_accounts')).map((a) => a.username)).toContain('nina')
  })
})
