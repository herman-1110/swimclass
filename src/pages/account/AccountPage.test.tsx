import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { accountKeys, SessionContext } from '@/entities/account'
import { isLogOutRequest } from '@/features/log-out'
import { type AuthSession, getSession, logIn, logOut } from '@/shared/api/auth'
import { demoDb } from '@/shared/api/demo/db'
import { AppError, readRows, updateRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { ROUTES } from '@/shared/config/routes'

import { AccountPage } from './AccountPage'

// Runs in demo mode: the real migrations and seed in PGlite, with RLS. The page alone,
// signed in through SessionContext (pages may not import app/, so no layout or guards).
// One test makes the details' save fail as a dropped connection does; otherwise
// updateRows is the real one.
vi.mock('@/shared/api/rpc', async (importOriginal) => {
  const rpc = await importOriginal<typeof import('@/shared/api/rpc')>()
  return { ...rpc, updateRows: vi.fn(rpc.updateRows) }
})

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

beforeEach(() => {
  vi.mocked(updateRows).mockClear()
})

afterEach(async () => {
  cleanup()
  await logOut()
})

function renderAccount(session: AuthSession, queryClient = newClient()) {
  const router = createMemoryRouter(
    [
      { path: ROUTES.account, Component: AccountPage },
      { path: ROUTES.login, element: <h1>Welcome back</h1> },
      { path: ROUTES.coachSchedule, element: <h1>Schedule</h1> },
    ],
    { initialEntries: [ROUTES.account] },
  )
  render(
    <QueryClientProvider client={queryClient}>
      <SessionContext value={{ status: 'signed-in', session }}>
        <RouterProvider router={router} />
      </SessionContext>
    </QueryClientProvider>,
  )
  return router
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderAs(username: string) {
  const session = await logIn(username, DEMO_PASSWORD)
  return { router: renderAccount(session), session }
}

const input = (label: string) => screen.getByLabelText<HTMLInputElement>(label)
const section = (name: string) => screen.getByRole('region', { name })
const saveDetails = () => screen.getByRole('button', { name: /^(Save details|Saving…)$/ })

function type(label: string, value: string) {
  fireEvent.change(input(label), { target: { value } })
}

async function savedDetails(accountId: string) {
  const [profile] = await readRows('profiles', {
    eq: { id: accountId },
    columns: ['display_name', 'phone'],
  })
  return profile
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

describe('AccountPage', () => {
  it('shows meiling’s details, the password form and Log out (scenario 10)', async () => {
    await renderAs('meiling')
    expect(screen.getByRole('heading', { level: 1, name: 'Account' })).toBeTruthy()
    const details = await screen.findByRole('region', { name: 'Your details' })
    // Read-only: only the coach can change these.
    expect([...details.querySelectorAll('dt, dd')].map((element) => element.textContent)).toEqual([
      'Username',
      'meiling',
      'Email',
      'meiling@example.com',
    ])
    expect(
      within(details).getByText('To change your username or email, message your coach.'),
    ).toBeTruthy()
    expect(input('Name').value).toBe('Mei Ling')
    expect(input('Phone (optional)').value).toBe('012-000 0002')
    expect(
      ['id', 'autocomplete', 'maxlength'].map((name) => input('Name').getAttribute(name)),
    ).toEqual(['account-name', 'name', '100'])
    expect(
      ['id', 'type', 'autocomplete', 'maxlength'].map((name) =>
        input('Phone (optional)').getAttribute(name),
      ),
    ).toEqual(['account-phone', 'tel', 'tel', '30'])
    // Nothing to save until something changes.
    expect(saveDetails().getAttribute('aria-disabled')).toBe('true')

    const password = section('Password')
    expect(within(password).getByText('At least 8 characters.')).toBeTruthy()
    expect(input('New password').id).toBe('account-password')
    expect(input('Confirm new password').id).toBe('account-password-confirm')
    expect(within(password).getByRole('button', { name: 'Save new password' })).toBeTruthy()

    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Back to coach view' })).toBeNull()
    await waitFor(() => expect(document.title).toBe('Account · Swim Class'))
  })

  it('saves a new name, trimmed, and says so until the next edit', async () => {
    const { session } = await renderAs('meiling')
    await screen.findByRole('region', { name: 'Your details' })
    type('Name', '  Mei Ling Tan ')
    expect(saveDetails().hasAttribute('aria-disabled')).toBe(false)
    fireEvent.click(saveDetails())
    await waitFor(() => expect(screen.getByText('Details saved.')).toBeTruthy())
    expect(screen.getByText('Details saved.').getAttribute('role')).toBe('status')
    expect(await savedDetails(session.userId)).toEqual({
      display_name: 'Mei Ling Tan',
      phone: '012-000 0002',
    })
    expect(input('Name').value).toBe('Mei Ling Tan')
    expect(saveDetails().getAttribute('aria-disabled')).toBe('true')

    type('Name', 'Mei Ling')
    expect(screen.queryByText('Details saved.')).toBeNull()
    fireEvent.click(saveDetails())
    await screen.findByText('Details saved.')
    expect(await savedDetails(session.userId)).toMatchObject({ display_name: 'Mei Ling' })
  })

  it('saves a cleared phone as none, and wants a name', async () => {
    const { session } = await renderAs('farah')
    await screen.findByRole('region', { name: 'Your details' })
    type('Phone (optional)', '  ')
    fireEvent.click(saveDetails())
    await screen.findByText('Details saved.')
    expect(await savedDetails(session.userId)).toEqual({ display_name: 'Farah', phone: null })
    expect(input('Phone (optional)').value).toBe('')

    type('Name', '   ')
    fireEvent.click(saveDetails())
    expect(screen.getByText('Enter your name.')).toBeTruthy()
    expect(document.activeElement).toBe(input('Name'))
    // Focus moved to the name, which is read with its message: nothing is said twice.
    expect(screen.queryByRole('alert')).toBeNull()
    expect(await savedDetails(session.userId)).toMatchObject({ display_name: 'Farah' })
  })

  it('says the message when Enter is pressed in the very field that is wrong', async () => {
    await renderAs('kai')
    await screen.findByRole('region', { name: 'Your details' })
    // Enter in the blanked name: focus is already there, so the message is said as an alert.
    type('Name', '')
    input('Name').focus()
    fireEvent.submit(input('Name').form as HTMLFormElement)
    expect(document.activeElement).toBe(input('Name'))
    expect(screen.getByRole('alert').textContent).toBe('Enter your name.')

    // The same for a short new password, in the other form.
    type('New password', 'short')
    input('New password').focus()
    fireEvent.submit(input('New password').form as HTMLFormElement)
    expect(document.activeElement).toBe(input('New password'))
    expect(screen.getByRole('alert').textContent).toBe('Use at least 8 characters.')
  })

  it('says "Saving…" while the details save', async () => {
    await renderAs('grace')
    await screen.findByRole('region', { name: 'Your details' })
    type('Name', 'Grace Lim')
    const release = await holdDatabase()
    try {
      fireEvent.click(saveDetails())
      await waitFor(() => expect(saveDetails().textContent).toBe('Saving…'))
      expect(saveDetails().getAttribute('aria-busy')).toBe('true')
    } finally {
      await release()
    }
    await screen.findByText('Details saved.')
  })

  it('checks the new password, saves it and empties both fields', async () => {
    await renderAs('ethan')
    await screen.findByRole('region', { name: 'Password' })
    const savePassword = () => screen.getByRole('button', { name: 'Save new password' })
    type('New password', '12345')
    type('Confirm new password', '12345')
    fireEvent.click(savePassword())
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy()
    expect(document.activeElement).toBe(input('New password'))

    type('New password', 'swim-new-2026')
    type('Confirm new password', 'swim-new-2025')
    fireEvent.click(savePassword())
    expect(
      screen.getByText('The passwords don’t match. Type the same password twice.'),
    ).toBeTruthy()
    expect(document.activeElement).toBe(input('Confirm new password'))

    type('Confirm new password', 'swim-new-2026')
    fireEvent.click(savePassword())
    await screen.findByText('New password saved.')
    expect(input('New password').value).toBe('')
    expect(input('Confirm new password').value).toBe('')
    type('New password', 'x')
    expect(screen.queryByText('New password saved.')).toBeNull()

    await logOut()
    await expect(logIn('ethan', 'swim-new-2026')).resolves.toMatchObject({
      email: 'ethan@example.com',
    })
  })

  it('says when the details couldn’t be saved, above the button', async () => {
    vi.mocked(updateRows).mockRejectedValueOnce(new AppError('network'))
    const { session } = await renderAs('meiling')
    await screen.findByRole('region', { name: 'Your details' })
    type('Name', 'Mei Ling Tan')
    fireEvent.click(saveDetails())
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(
      'Couldn’t reach the server. Check your connection and try again.',
    )
    expect(alert.nextElementSibling?.contains(saveDetails())).toBe(true)
    // Nothing was saved, so it can be tried again.
    expect(saveDetails().textContent).toBe('Save details')
    expect(saveDetails().hasAttribute('aria-disabled')).toBe(false)
    expect(screen.queryByText('Details saved.')).toBeNull()
    expect(input('Name').value).toBe('Mei Ling Tan')
    expect(await savedDetails(session.userId)).toMatchObject({ display_name: 'Mei Ling' })
  })

  it('refuses the current password', async () => {
    await renderAs('meiling')
    await screen.findByRole('region', { name: 'Password' })
    type('New password', DEMO_PASSWORD)
    type('Confirm new password', DEMO_PASSWORD)
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(
      await screen.findByText('That’s your current password. Choose a different one.'),
    ).toBeTruthy()
    expect(document.activeElement).toBe(input('New password'))
  })

  it('says "Saving…" while the new password saves', async () => {
    await renderAs('priya')
    await screen.findByRole('region', { name: 'Password' })
    const savePassword = () => screen.getByRole('button', { name: /^(Save new password|Saving…)$/ })
    type('New password', 'swim-new-2026')
    type('Confirm new password', 'swim-new-2026')
    const release = await holdDatabase()
    try {
      fireEvent.click(savePassword())
      await waitFor(() => expect(savePassword().textContent).toBe('Saving…'))
      expect(savePassword().getAttribute('aria-busy')).toBe('true')
      expect(savePassword().getAttribute('aria-disabled')).toBe('true')
    } finally {
      await release()
    }
    await screen.findByText('New password saved.')
  })

  it('says something went wrong when the session is gone before the password saves', async () => {
    await renderAs('meiling')
    await screen.findByRole('region', { name: 'Password' })
    // Signed out meanwhile (another tab): demo mode answers not_signed_in (auth spec W5).
    await logOut()
    type('New password', 'swim-new-2026')
    type('Confirm new password', 'swim-new-2026')
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Something went wrong. Refresh the page and try again.')
    const savePassword = screen.getByRole('button', { name: 'Save new password' })
    expect(alert.nextElementSibling?.contains(savePassword)).toBe(true)
    expect(screen.queryByText('New password saved.')).toBeNull()
  })

  it('logs out through Log in, which ends the session', async () => {
    const { router } = await renderAs('meiling')
    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }))
    await screen.findByRole('heading', { name: 'Welcome back' })
    expect(isLogOutRequest(router.state.location.state)).toBe(true)
  })

  it('gives the coach his own details and a way back to the coach view (scenario 11)', async () => {
    const { router } = await renderAs('herman')
    const details = await screen.findByRole('region', { name: 'Your details' })
    expect([...details.querySelectorAll('dd')].map((element) => element.textContent)).toEqual([
      'herman',
      'herman@example.com',
    ])
    expect(input('Name').value).toBe('Herman')
    expect(input('Phone (optional)').value).toBe('012-000 0001')
    const back = screen.getByRole('link', { name: 'Back to coach view' })
    expect(back.getAttribute('href')).toBe(ROUTES.coachSchedule)
    // Back to coach view, then Log out, after the password form (auth spec §7.1).
    expect(back.nextElementSibling).toBe(screen.getByRole('button', { name: 'Log out' }))
    fireEvent.click(back)
    await screen.findByRole('heading', { name: 'Schedule' })
    expect(router.state.location.pathname).toBe(ROUTES.coachSchedule)
  })

  it('keeps its place while the profile loads', async () => {
    const session = await logIn('meiling', DEMO_PASSWORD)
    const release = await holdDatabase()
    try {
      renderAccount(session)
      expect(screen.getByRole('heading', { level: 1, name: 'Account' })).toBeTruthy()
      expect(screen.getByRole('status').textContent).toBe('Loading…')
      expect(screen.getByRole('status').parentElement?.getAttribute('aria-busy')).toBe('true')
    } finally {
      await release()
    }
    expect(await screen.findByRole('region', { name: 'Your details' })).toBeTruthy()
    expect(screen.queryByText('Loading…')).toBeNull()
  })

  it('says when the profile can’t be read, and tries again', async () => {
    const session = await logIn('meiling', DEMO_PASSWORD)
    const queryClient = newClient()
    // The profile read has failed, and nothing retries it until asked.
    queryClient.setQueryDefaults(accountKeys.me(session.userId), { retryOnMount: false })
    await queryClient.prefetchQuery({
      queryKey: accountKeys.me(session.userId),
      queryFn: () => Promise.reject(new AppError('network')),
    })
    renderAccount(session, queryClient)
    expect(screen.getByRole('alert').textContent).toContain(
      'Couldn’t reach the server. Check your connection and try again.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('region', { name: 'Your details' })).toBeTruthy()
    expect(input('Name').value).toBe('Mei Ling')
  })
})
