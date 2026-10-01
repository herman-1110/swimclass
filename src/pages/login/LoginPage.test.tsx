import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { SessionContext } from '@/entities/account'
import { getSession, logIn, logOut } from '@/shared/api/auth'
import { demoDb } from '@/shared/api/demo/db'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'

import { LoginPage } from './LoginPage'

// Runs in demo mode: the real migrations and seed in PGlite, and demo mode's stand-in for
// the `login` Edge Function. The page alone, signed out (pages may not import app/, so no
// guards: after logging in, RedirectIfSignedIn would carry the person on). logIn is the
// real one, watched, so a test can count the calls.
vi.mock('@/shared/api/auth', async (importOriginal) => {
  const auth = await importOriginal<typeof import('@/shared/api/auth')>()
  return { ...auth, logIn: vi.fn(auth.logIn) }
})

const MEILING = 'a0000000-0000-4000-8000-000000000002'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

beforeEach(() => {
  vi.mocked(logIn).mockClear()
})

afterEach(async () => {
  cleanup()
  await logOut()
})

function renderLogin() {
  const router = createMemoryRouter(
    [
      { path: ROUTES.login, Component: LoginPage },
      { path: ROUTES.signup, element: <h1>Create an account</h1> },
      { path: ROUTES.forgotPassword, element: <h1>Forgot your password?</h1> },
    ],
    { initialEntries: [ROUTES.login] },
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

/** An element's attributes, by name. */
const attributes = (element: Element) =>
  Object.fromEntries([...element.attributes].map(({ name, value }) => [name, value]))
const logInButton = () => screen.getByRole('button', { name: /^Log(ging)? in/ })

function fill(username: string, password: string) {
  fireEvent.change(input('Username'), { target: { value: username } })
  fireEvent.change(input('Password'), { target: { value: password } })
}

/**
 * Holds the demo database in an open transaction, so the next call waits (as it would on a
 * slow connection) until the returned function is called.
 */
async function holdDatabase(): Promise<() => Promise<void>> {
  const db = await demoDb()
  let release = () => {}
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  let started = () => {}
  const holding = new Promise<void>((resolve) => {
    started = resolve
  })
  const held = db.transaction(async () => {
    started()
    await released
  })
  await holding
  return async () => {
    release()
    await held
  }
}

describe('LoginPage', () => {
  it('shows the drawing: heading, two fields, Log in and the two links', async () => {
    renderLogin()
    const heading = screen.getByRole('heading', { level: 1, name: 'Welcome back' })
    expect(heading.nextElementSibling?.textContent).toBe(
      'Log in to book lessons and check your package.',
    )
    // The form is named by the heading (auth spec §7.2).
    expect(screen.getByRole('form', { name: 'Welcome back' })).toBeTruthy()

    expect(attributes(input('Username'))).toMatchObject({
      id: 'login-username',
      placeholder: 'e.g. meiling',
      autocomplete: 'username',
      autocapitalize: 'none',
      autocorrect: 'off',
      spellcheck: 'false',
      enterkeyhint: 'next',
      required: '',
    })
    expect(attributes(input('Password'))).toMatchObject({
      id: 'login-password',
      type: 'password',
      placeholder: 'Your password',
      autocomplete: 'current-password',
      enterkeyhint: 'go',
    })
    expect(logInButton().getAttribute('type')).toBe('submit')

    expect(
      screen.getByRole('link', { name: 'Forgot username or password?' }).getAttribute('href'),
    ).toBe(ROUTES.forgotPassword)
    const signUp = screen.getByRole('link', { name: 'New here? Create an account' })
    expect(signUp.getAttribute('href')).toBe(ROUTES.signup)
    // "Create an account" in 600 accent, "New here?" in ink, as drawn.
    expect(signUp.querySelector('.text-accent')?.textContent).toBe('Create an account')
    expect(screen.getByText('Your coach approves new accounts before you can book.')).toBeTruthy()
    await waitFor(() => expect(document.title).toBe('Welcome back · Swim Class'))
  })

  it('names the empty fields before any call, and focuses the first', async () => {
    renderLogin()
    fireEvent.click(logInButton())
    expect(screen.getByText('Enter your username.')).toBeTruthy()
    expect(screen.getByText('Enter your password.')).toBeTruthy()
    expect(document.activeElement).toBe(input('Username'))
    expect(input('Username').getAttribute('aria-invalid')).toBe('true')
    expect(input('Username').getAttribute('aria-describedby')).toBe('login-username-error')

    // A username of spaces is still empty; the password's own message goes once it is typed.
    fill('  ', 'x')
    fireEvent.click(logInButton())
    expect(screen.getByText('Enter your username.')).toBeTruthy()
    expect(screen.queryByText('Enter your password.')).toBeNull()

    fill('meiling', '')
    fireEvent.click(logInButton())
    expect(screen.queryByText('Enter your username.')).toBeNull()
    expect(document.activeElement).toBe(input('Password'))
    expect(await getSession()).toBeNull()
  })

  it('says when the username or password is wrong, then clears and focuses the password', async () => {
    renderLogin()
    fill('meiling', 'wrong')
    fireEvent.click(logInButton())
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Wrong username or password.')
    expect(input('Password').value).toBe('')
    expect(input('Username').value).toBe('meiling')
    expect(document.activeElement).toBe(input('Password'))
    // The password field is described by the message, so it is read on focus.
    expect(input('Password').getAttribute('aria-describedby')).toBe(alert.id)
    expect(await getSession()).toBeNull()
  })

  it('logs in with the username trimmed and lowercased', async () => {
    renderLogin()
    fill(' MeiLing ', DEMO_PASSWORD)
    fireEvent.click(logInButton())
    await waitFor(async () => expect((await getSession())?.userId).toBe(MEILING))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('says "Logging in…" and ignores more presses while it runs', async () => {
    renderLogin()
    fill('meiling', DEMO_PASSWORD)
    const release = await holdDatabase()
    try {
      fireEvent.click(logInButton())
      const button = await screen.findByRole('button', { name: 'Logging in…' })
      expect(button.getAttribute('aria-busy')).toBe('true')
      expect(button.getAttribute('aria-disabled')).toBe('true')
      // The fields stay editable; another press, or Enter, asks nothing more.
      expect(input('Username').disabled).toBe(false)
      fireEvent.click(button)
      fireEvent.submit(screen.getByRole('form', { name: 'Welcome back' }))
    } finally {
      await release()
    }
    await waitFor(async () => expect((await getSession())?.userId).toBe(MEILING))
    expect(logIn).toHaveBeenCalledTimes(1)
  })

  it('says to wait after 10 failures in 15 minutes, keeping both fields', async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await expect(logIn('kai', `wrong-${attempt}`)).rejects.toMatchObject({
        code: 'invalid_login',
      })
    }
    renderLogin()
    fill('kai', DEMO_PASSWORD)
    fireEvent.click(logInButton())
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Too many tries. Wait 15 minutes and try again.',
    )
    expect(input('Username').value).toBe('kai')
    expect(input('Password').value).toBe(DEMO_PASSWORD)
    expect(await getSession()).toBeNull()
  })

  it('opens Forgot password', async () => {
    const router = renderLogin()
    fireEvent.click(screen.getByRole('link', { name: 'Forgot username or password?' }))
    await screen.findByRole('heading', { name: 'Forgot your password?' })
    expect(router.state.location.pathname).toBe(ROUTES.forgotPassword)
  })
})
