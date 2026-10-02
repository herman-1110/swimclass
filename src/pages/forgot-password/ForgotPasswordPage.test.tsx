import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { SessionContext } from '@/entities/account'
import { getSession, logOut, sendPasswordReset } from '@/shared/api/auth'
import { AppError } from '@/shared/api/rpc'
import { ROUTES } from '@/shared/config/routes'

import { ForgotPasswordPage } from './ForgotPasswordPage'

// Runs in demo mode, which sends no email and always succeeds. Two tests make the request
// wait, or fail, as Supabase can; otherwise it is the real one.
vi.mock('@/shared/api/auth', async (importOriginal) => {
  const auth = await importOriginal<typeof import('@/shared/api/auth')>()
  return { ...auth, sendPasswordReset: vi.fn(auth.sendPasswordReset) }
})

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

beforeEach(() => {
  vi.mocked(sendPasswordReset).mockClear()
})

afterEach(cleanup)

function renderForgot() {
  const router = createMemoryRouter(
    [
      { path: ROUTES.forgotPassword, Component: ForgotPasswordPage },
      { path: ROUTES.login, element: <h1>Welcome back</h1> },
    ],
    { initialEntries: [ROUTES.forgotPassword] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <SessionContext value={{ status: 'signed-out' }}>
        <RouterProvider router={router} />
      </SessionContext>
    </QueryClientProvider>,
  )
  return router
}

const email = () => screen.getByLabelText<HTMLInputElement>('Email')
/** Presses Send as a pointer does: focus moves to the button (jsdom's click leaves it). */
function send() {
  const button = screen.getByRole('button', { name: /^Send/ })
  button.focus()
  fireEvent.click(button)
}

describe('ForgotPasswordPage', () => {
  it('asks for the email, and says the link shows the username too', async () => {
    renderForgot()
    const heading = screen.getByRole('heading', { level: 1, name: 'Forgot your password?' })
    expect(heading.nextElementSibling?.textContent).toBe(
      'Enter the email you signed up with. We’ll send you a link that shows your username and lets you set a new password.',
    )
    expect(screen.getByRole('form', { name: 'Forgot your password?' })).toBeTruthy()
    expect(
      ['id', 'type', 'inputmode', 'autocomplete', 'autocapitalize'].map((name) =>
        email().getAttribute(name),
      ),
    ).toEqual(['forgot-email', 'email', 'email', 'email', 'none'])
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to log in' }).getAttribute('href')).toBe(
      ROUTES.login,
    )
    await waitFor(() => expect(document.title).toBe('Forgot your password? · Swim Class'))
  })

  it('names an empty or malformed address before any call', () => {
    renderForgot()
    for (const value of ['', 'meiling@example']) {
      fireEvent.change(email(), { target: { value } })
      send()
      expect(screen.getByText('Enter an email address like name@example.com.')).toBeTruthy()
      expect(document.activeElement).toBe(email())
      expect(email().getAttribute('aria-invalid')).toBe('true')
    }
    // The message goes as soon as the address changes.
    fireEvent.change(email(), { target: { value: 'meiling@example.co' } })
    expect(screen.queryByText('Enter an email address like name@example.com.')).toBeNull()
    expect(sendPasswordReset).not.toHaveBeenCalled()
  })

  it('says the message when Enter is pressed in the empty email, where focus already is', () => {
    renderForgot()
    send()
    // Focus moved to the field, so it is read with its message: no alert besides.
    expect(document.activeElement).toBe(email())
    expect(screen.queryByRole('alert')).toBeNull()
    // Enter in the field: focus can't move, so the message is said as an alert.
    fireEvent.submit(screen.getByRole('form', { name: 'Forgot your password?' }))
    expect(document.activeElement).toBe(email())
    expect(screen.getByRole('alert').textContent).toBe(
      'Enter an email address like name@example.com.',
    )
    expect(sendPasswordReset).not.toHaveBeenCalled()
  })

  it('says to check the email, the same for any address (scenario 9)', async () => {
    renderForgot()
    fireEvent.change(email(), { target: { value: ' nobody@example.com ' } })
    send()
    const heading = await screen.findByRole('heading', { level: 1, name: 'Check your email' })
    expect(document.activeElement).toBe(heading)
    expect(sendPasswordReset).toHaveBeenCalledWith('nobody@example.com')
    expect(heading.nextElementSibling?.textContent).toBe(
      'If an account uses nobody@example.com, we’ve sent it a link to set a new password.',
    )
    expect(
      screen.getByText(
        'Demo mode sends no email. Log in, then change the password on your Account page.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to log in' })).toBeTruthy()
    await waitFor(() => expect(document.title).toBe('Check your email · Swim Class'))
  })

  it('says "Sending…" while it asks, and a refusal above the button', async () => {
    let refuse = () => {}
    vi.mocked(sendPasswordReset).mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          refuse = () => reject(new AppError('over_email_send_rate_limit'))
        }),
    )
    renderForgot()
    fireEvent.change(email(), { target: { value: 'meiling@example.com' } })
    send()
    const button = await screen.findByRole('button', { name: 'Sending…' })
    expect(button.getAttribute('aria-busy')).toBe('true')
    send()
    expect(sendPasswordReset).toHaveBeenCalledTimes(1)
    refuse()
    expect((await screen.findByRole('alert')).textContent).toBe(
      'We can’t send another email just yet. Wait a few minutes and try again.',
    )
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Forgot your password?' })).toBeTruthy()
  })
})
