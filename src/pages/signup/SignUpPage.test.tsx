import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { SessionContext } from '@/entities/account'
import { getSession, logOut, signUp } from '@/shared/api/auth'
import { demoDb } from '@/shared/api/demo/db'
import { AppError } from '@/shared/api/rpc'
import { ROUTES } from '@/shared/config/routes'

import { SignUpPage } from './SignUpPage'

// Runs in demo mode: the real migrations, seed and sign-up trigger in PGlite. Demo sign-up
// sends no email and counts the address as confirmed (auth spec §5.5). Two tests make
// signUp answer as Supabase can (confirmations off; a wait, then a rate limit); otherwise
// it is the real one.
vi.mock('@/shared/api/auth', async (importOriginal) => {
  const auth = await importOriginal<typeof import('@/shared/api/auth')>()
  return { ...auth, signUp: vi.fn(auth.signUp) }
})

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

beforeEach(() => {
  vi.mocked(signUp).mockClear()
})

afterEach(cleanup)

function renderSignUp() {
  const router = createMemoryRouter(
    [
      { path: ROUTES.signup, Component: SignUpPage },
      { path: ROUTES.login, element: <h1>Welcome back</h1> },
      { path: ROUTES.home, element: <h1>Start</h1> },
    ],
    { initialEntries: [ROUTES.signup] },
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

const input = (label: string) => screen.getByLabelText<HTMLInputElement>(label)
const usernameStatus = () => document.getElementById('signup-username-status')?.textContent
/** The username check waits 400 ms after typing stops, then asks the database. */
const CHECK = { timeout: 3000 }

function type(label: string, value: string) {
  fireEvent.change(input(label), { target: { value } })
}

function fillIn(values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) type(label, value)
}

const newbie = {
  Username: 'newbie',
  Name: 'New Person',
  Email: 'newbie@example.com',
  'Phone (optional)': '012-111 2222',
  Password: 'swim-new-2026',
  'Confirm password': 'swim-new-2026',
}

describe('SignUpPage', () => {
  it('asks for a username, name, email, phone and a password twice', async () => {
    renderSignUp()
    const heading = screen.getByRole('heading', { level: 1, name: 'Create an account' })
    expect(heading.nextElementSibling?.textContent).toBe('Sign up to book lessons with your coach.')
    expect(screen.getByRole('form', { name: 'Create an account' })).toBeTruthy()
    // Fields in the order of BR-1, with help that gives the format (auth spec §2.3, §7.3).
    expect(
      [...document.querySelectorAll('form input')].map((field) => [
        field.id,
        field.getAttribute('type'),
        field.getAttribute('autocomplete'),
        field.getAttribute('maxlength'),
      ]),
    ).toEqual([
      ['signup-username', 'text', 'username', '30'],
      ['signup-name', 'text', 'name', '100'],
      ['signup-email', 'email', 'email', '254'],
      ['signup-phone', 'tel', 'tel', '30'],
      ['signup-password', 'password', 'new-password', null],
      ['signup-password-confirm', 'password', 'new-password', null],
    ])
    // The username's keyboard is set up as the log-in username's (auth spec §7.3).
    expect(
      ['autocapitalize', 'autocorrect', 'spellcheck', 'enterkeyhint'].map((name) =>
        input('Username').getAttribute(name),
      ),
    ).toEqual(['none', 'off', 'false', 'next'])
    expect(
      screen.getByText(
        '3 to 30 small letters, numbers, dots or underscores. You’ll log in with it.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Your own name. Your coach adds your students.')).toBeTruthy()
    expect(screen.getByText('We’ll email you a link to confirm it.')).toBeTruthy()
    expect(screen.getByText('At least 8 characters.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create account' }).getAttribute('type')).toBe(
      'submit',
    )
    expect(
      screen.getByRole('link', { name: 'Already have an account? Log in' }).getAttribute('href'),
    ).toBe(ROUTES.login)
    expect(screen.getByText('Your coach approves new accounts before you can book.')).toBeTruthy()
    await waitFor(() => expect(document.title).toBe('Create an account · Swim Class'))
  })

  it('checks the username as it is typed (auth spec §8.2, scenario 5)', async () => {
    renderSignUp()
    // Lowercased, without spaces, as typed.
    type('Username', 'Mei Ling')
    expect(input('Username').value).toBe('meiling')
    expect(usernameStatus()).toBe('Checking…')
    await waitFor(() => expect(usernameStatus()).toBe('That username is taken.'), CHECK)
    expect(input('Username').getAttribute('aria-invalid')).toBe('true')
    expect(input('Username').getAttribute('aria-describedby')).toBe(
      'signup-username-help signup-username-status',
    )

    // The wrong format is never checked, and is named once the field is left.
    type('Username', 'ab')
    expect(usernameStatus()).toBe('')
    expect(screen.queryByText(/^Use 3 to 30/)).toBeNull()
    fireEvent.blur(input('Username'))
    expect(
      screen.getByText('Use 3 to 30 small letters, numbers, dots or underscores.'),
    ).toBeTruthy()
    // It takes the help's place.
    expect(screen.queryByText(/You’ll log in with it/)).toBeNull()

    type('Username', 'someone.new')
    expect(screen.queryByText(/^Use 3 to 30/)).toBeNull()
    await waitFor(() => expect(usernameStatus()).toBe('That username is available.'), CHECK)
    expect(input('Username').hasAttribute('aria-invalid')).toBe(false)
  })

  it('names the wrong format only once the field is left with something in it', () => {
    renderSignUp()
    // Passing through the empty field (Tab, then Shift+Tab back) doesn't count as leaving it.
    fireEvent.blur(input('Username'))
    type('Username', 'n')
    expect(screen.queryByText(/^Use 3 to 30/)).toBeNull()
    expect(input('Username').hasAttribute('aria-invalid')).toBe(false)
    expect(screen.getByText(/You’ll log in with it/)).toBeTruthy()

    fireEvent.blur(input('Username'))
    expect(
      screen.getByText('Use 3 to 30 small letters, numbers, dots or underscores.'),
    ).toBeTruthy()
    expect(input('Username').getAttribute('aria-invalid')).toBe('true')
  })

  it('names every problem before any call, and focuses the first', () => {
    renderSignUp()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(
      screen.getByText('Use 3 to 30 small letters, numbers, dots or underscores.'),
    ).toBeTruthy()
    expect(screen.getByText('Enter your name.')).toBeTruthy()
    expect(screen.getByText('Enter an email address like name@example.com.')).toBeTruthy()
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy()
    expect(document.activeElement).toBe(input('Username'))

    fillIn({
      ...newbie,
      Username: 'newbie.two',
      Email: 'newbie.two@example',
      'Confirm password': 'x',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Enter an email address like name@example.com.')).toBeTruthy()
    expect(
      screen.getByText('The passwords don’t match. Type the same password twice.'),
    ).toBeTruthy()
    expect(document.activeElement).toBe(input('Email'))
    expect(vi.mocked(signUp)).not.toHaveBeenCalled()
  })

  it('makes the account and says to confirm the email (scenario 6)', async () => {
    renderSignUp()
    fillIn(newbie)
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    const heading = await screen.findByRole('heading', { level: 1, name: 'Confirm your email' })
    // It replaces the form, so focus moves to it.
    expect(document.activeElement).toBe(heading)
    expect(
      screen.getByText(
        'Check your email to confirm, then wait for your coach to approve your account.',
      ),
    ).toBeTruthy()
    expect(heading.parentElement?.nextElementSibling?.textContent).toBe(
      'We sent the link to newbie@example.com.' +
        'Demo mode sends no email, and the address counts as confirmed: you can log in now.',
    )
    expect(screen.getByRole('link', { name: 'Back to log in' }).getAttribute('href')).toBe(
      ROUTES.login,
    )
    expect(screen.queryByRole('form')).toBeNull()
    await waitFor(() => expect(document.title).toBe('Confirm your email · Swim Class'))

    const { rows } = await (
      await demoDb()
    ).query(
      `select username, display_name, phone, role, approved from public.profiles
       where username = 'newbie'`,
    )
    expect(rows).toEqual([
      {
        username: 'newbie',
        display_name: 'New Person',
        phone: '012-111 2222',
        role: 'customer',
        approved: false,
      },
    ])
  })

  it('says when an account already uses the email (demo mode)', async () => {
    renderSignUp()
    fillIn({ ...newbie, Username: 'second.try', Email: 'meiling@example.com' })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(
      await screen.findByText(
        'An account already uses that email. Log in, or use Forgot username or password.',
      ),
    ).toBeTruthy()
    expect(document.activeElement).toBe(input('Email'))
    expect(input('Email').getAttribute('aria-invalid')).toBe('true')
  })

  it('says "Creating account…" while it asks, and a refusal above the button', async () => {
    let refuse = () => {}
    vi.mocked(signUp).mockImplementationOnce(
      () =>
        new Promise<{ confirmEmail: boolean }>((_, reject) => {
          refuse = () => reject(new AppError('over_email_send_rate_limit'))
        }),
    )
    renderSignUp()
    fillIn({ ...newbie, Username: 'busy.try', Email: 'busy.try@example.com' })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    const button = await screen.findByRole('button', { name: 'Creating account…' })
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.getAttribute('aria-disabled')).toBe('true')
    // It asks once the username check is in; another press, or Enter, asks nothing more.
    await waitFor(() => expect(signUp).toHaveBeenCalledTimes(1), CHECK)
    fireEvent.click(button)
    fireEvent.submit(screen.getByRole('form', { name: 'Create an account' }))
    refuse()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(
      'We can’t send another email just yet. Wait a few minutes and try again.',
    )
    expect(alert.nextElementSibling).toBe(screen.getByRole('button', { name: 'Create account' }))
    expect(signUp).toHaveBeenCalledTimes(1)
    // The form stays, with everything typed, to try again later.
    expect(screen.getByRole('form', { name: 'Create an account' })).toBeTruthy()
    expect(input('Email').value).toBe('busy.try@example.com')
  })

  it('goes home when Supabase signs the person in at once (no confirmation email)', async () => {
    vi.mocked(signUp).mockResolvedValueOnce({ confirmEmail: false })
    const router = renderSignUp()
    fillIn({ ...newbie, Username: 'third.try', Email: 'third.try@example.com' })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByRole('heading', { name: 'Start' })
    expect(router.state.location.pathname).toBe(ROUTES.home)
    expect(router.state.historyAction).toBe('REPLACE')
  })
})
