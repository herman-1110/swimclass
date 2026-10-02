import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { SessionContext, type SessionState } from '@/entities/account'
import { getSession, logIn, logOut, updatePassword } from '@/shared/api/auth'
import { AppError } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'

import { ResetPasswordPage } from './ResetPasswordPage'

// Runs in demo mode, which sends no reset email: the page works for a signed-in account
// (auth spec §5.5). The session comes from SessionContext (pages may not import app/). One
// test makes updatePassword wait, then fail, as Supabase can; otherwise it is the real one.
vi.mock('@/shared/api/auth', async (importOriginal) => {
  const auth = await importOriginal<typeof import('@/shared/api/auth')>()
  return { ...auth, updatePassword: vi.fn(auth.updatePassword) }
})

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

beforeEach(() => {
  vi.mocked(updatePassword).mockClear()
})

afterEach(async () => {
  cleanup()
  await logOut()
})

/** Renders the page; `setSession` hands it another session, as SessionProvider would. */
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
  const tree = (state: SessionState) => (
    <QueryClientProvider client={queryClient}>
      <SessionContext value={state}>
        <RouterProvider router={router} />
      </SessionContext>
    </QueryClientProvider>
  )
  const { rerender } = render(tree(session))
  return { router, setSession: (state: SessionState) => rerender(tree(state)) }
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
    // Opened signed out, nothing takes focus: no form was replaced.
    expect(document.activeElement).toBe(document.body)
    expect(heading.hasAttribute('tabindex')).toBe(false)
    await waitFor(() => expect(document.title).toBe('This link has expired · Swim Class'))
  })

  it('says only "Loading…" while the link is read', () => {
    renderReset({ status: 'loading' })
    const heading = screen.getByRole('heading', { level: 1, name: 'Set a new password' })
    // Nothing asks for a password before there is a session to set it for (auth spec §2.5).
    expect(heading.nextElementSibling).toBeNull()
    expect(screen.queryByText(/Choose a new password/)).toBeNull()
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

  it('shows the expired page if the session ends before saving, and focuses it', async () => {
    await renderSignedIn('meiling')
    // Signed out meanwhile (another tab): demo mode answers not_signed_in.
    await logOut()
    typePasswords('swim-new-2026')
    save()
    const heading = await screen.findByRole('heading', { level: 1, name: 'This link has expired' })
    // It replaces the form, so focus moves to it (auth spec §7.5).
    expect(document.activeElement).toBe(heading)
  })

  it('focuses the expired page when the session ends while the form shows', async () => {
    const { setSession } = await renderSignedIn('meiling')
    input('New password').focus()
    await logOut()
    setSession({ status: 'signed-out' })
    const heading = await screen.findByRole('heading', { level: 1, name: 'This link has expired' })
    expect(document.activeElement).toBe(heading)
  })

  it('says "Saving…" while it saves, and a refusal above the button', async () => {
    let refuse = () => {}
    vi.mocked(updatePassword).mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          refuse = () => reject(new AppError('network'))
        }),
    )
    await renderSignedIn('meiling')
    typePasswords('swim-new-2026')
    save()
    const button = await screen.findByRole('button', { name: 'Saving…' })
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.getAttribute('aria-disabled')).toBe('true')
    // Another press, or Enter in a field, asks nothing more.
    save()
    fireEvent.submit(screen.getByRole('form', { name: 'Set a new password' }))
    refuse()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(
      'Couldn’t reach the server. Check your connection and try again.',
    )
    expect(alert.nextElementSibling).toBe(screen.getByRole('button', { name: 'Save new password' }))
    expect(updatePassword).toHaveBeenCalledTimes(1)
    // The form stays, with what was typed, to try again.
    expect(input('New password').value).toBe('swim-new-2026')
  })

  it('saves the new password, then goes on from there', async () => {
    const { router } = await renderSignedIn('daniel')
    const form = screen.getByRole('heading', { level: 1, name: 'Set a new password' })
    await waitFor(() => expect(form.nextElementSibling?.textContent).toContain('daniel'))
    typePasswords('swim-new-2026')
    save()
    const heading = await screen.findByRole('heading', { level: 1, name: 'New password saved' })
    expect(document.activeElement).toBe(heading)
    expect(heading.nextElementSibling?.textContent).toBe('You’re signed in as daniel.')
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
