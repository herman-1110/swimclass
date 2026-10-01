import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { SessionContext, type SessionState } from '@/entities/account'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'

import { ResetPasswordPage } from './ResetPasswordPage'

// Runs in demo mode, which sends no reset email: the page works for a signed-in account
// (auth spec §5.5). The session comes from SessionContext (pages may not import app/).

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(async () => {
  cleanup()
  await logOut()
})

function renderReset(session: SessionState) {
  const router = createMemoryRouter(
    [
      { path: ROUTES.resetPassword, Component: ResetPasswordPage },
      { path: ROUTES.forgotPassword, element: <h1>Forgot your password?</h1> },
      { path: ROUTES.login, element: <h1>Welcome back</h1> },
      { path: ROUTES.home, element: <h1>Start</h1> },
    ],
    { initialEntries: [ROUTES.resetPassword] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <SessionContext value={session}>
        <RouterProvider router={router} />
      </SessionContext>
    </QueryClientProvider>,
  )
  return router
}

/** The page as the reset link leaves it: signed in as `username`. */
async function renderSignedIn(username: string) {
  const session = await logIn(username, DEMO_PASSWORD)
  return renderReset({ status: 'signed-in', session })
}

const input = (label: string) => screen.getByLabelText<HTMLInputElement>(label)
const save = () => fireEvent.click(screen.getByRole('button', { name: /^Sav/ }))

function typePasswords(password: string, confirm = password) {
  fireEvent.change(input('New password'), { target: { value: password } })
  fireEvent.change(input('Confirm new password'), { target: { value: confirm } })
}

describe('ResetPasswordPage', () => {
  it('offers a new link when there is no session (the link expired or was used)', async () => {
    renderReset({ status: 'signed-out' })
    const heading = screen.getByRole('heading', { level: 1, name: 'This link has expired' })
    expect(heading.nextElementSibling?.textContent).toBe(
      'Reset links work once and stop working after a while. Ask for a new one.',
    )
    expect(screen.getByRole('link', { name: 'Ask for a new link' }).getAttribute('href')).toBe(
      ROUTES.forgotPassword,
    )
    expect(screen.getByRole('link', { name: 'Back to log in' }).getAttribute('href')).toBe(
      ROUTES.login,
    )
    expect(screen.queryByRole('form')).toBeNull()
    await waitFor(() => expect(document.title).toBe('This link has expired · Swim Class'))
  })

  it('says "Loading…" while the link is read', () => {
    renderReset({ status: 'loading' })
    expect(screen.getByRole('heading', { level: 1, name: 'Set a new password' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Loading…')
    expect(screen.queryByRole('form')).toBeNull()
  })

  it('shows the username, so a forgotten one comes back too (scenario 9)', async () => {
    await renderSignedIn('meiling')
    const heading = screen.getByRole('heading', { level: 1, name: 'Set a new password' })
    // "Choose a new password." until the profile is in.
    await waitFor(() =>
      expect(heading.nextElementSibling?.textContent).toBe(
        'Your username is meiling. Choose a new password.',
      ),
    )
    expect(screen.getByRole('form', { name: 'Set a new password' })).toBeTruthy()
    expect(
      ['id', 'type', 'autocomplete'].map((name) => input('New password').getAttribute(name)),
    ).toEqual(['reset-password', 'password', 'new-password'])
    expect(input('Confirm new password').id).toBe('reset-password-confirm')
    expect(screen.getByText('At least 8 characters.')).toBeTruthy()
    await waitFor(() => expect(document.title).toBe('Set a new password · Swim Class'))
  })

  it('checks the passwords before any call, and refuses the current one', async () => {
    await renderSignedIn('meiling')
    typePasswords('swim-26')
    save()
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy()
    expect(document.activeElement).toBe(input('New password'))

    typePasswords('swim-new-2026', 'swim-new-2025')
    save()
    expect(
      screen.getByText('The passwords don’t match. Type the same password twice.'),
    ).toBeTruthy()
    expect(document.activeElement).toBe(input('Confirm new password'))

    typePasswords(DEMO_PASSWORD)
    save()
    expect(
      await screen.findByText('That’s your current password. Choose a different one.'),
    ).toBeTruthy()
    expect(document.activeElement).toBe(input('New password'))
    expect(input('New password').getAttribute('aria-invalid')).toBe('true')
  })

  it('shows the expired page if the session ends before saving', async () => {
    await renderSignedIn('meiling')
    // Signed out meanwhile (another tab): demo mode answers not_signed_in.
    await logOut()
    typePasswords('swim-new-2026')
    save()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'This link has expired' }),
    ).toBeTruthy()
  })

  it('saves the new password, then goes on from there', async () => {
    const router = await renderSignedIn('daniel')
    const form = screen.getByRole('heading', { level: 1, name: 'Set a new password' })
    await waitFor(() => expect(form.nextElementSibling?.textContent).toContain('daniel'))
    typePasswords('swim-new-2026')
    save()
    const heading = await screen.findByRole('heading', { level: 1, name: 'New password saved' })
    expect(document.activeElement).toBe(heading)
    expect(heading.nextElementSibling?.textContent).toBe('You’re logged in as daniel.')
    await waitFor(() => expect(document.title).toBe('New password saved · Swim Class'))

    // The new password works; the old one doesn't.
    await logOut()
    await expect(logIn('daniel', DEMO_PASSWORD)).rejects.toMatchObject({ code: 'invalid_login' })
    await expect(logIn('daniel', 'swim-new-2026')).resolves.toMatchObject({
      email: 'daniel@example.com',
    })

    fireEvent.click(screen.getByRole('link', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'Start' })
    expect(router.state.location.pathname).toBe(ROUTES.home)
  })
})
