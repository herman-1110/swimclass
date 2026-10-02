import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { accountKeys, SessionContext } from '@/entities/account'
import { settingsKeys } from '@/entities/settings'
import { type AuthSession, getSession, logIn, logOut } from '@/shared/api/auth'
import { getBackend } from '@/shared/api/backend'
import { demoDb } from '@/shared/api/demo/db'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'
import { NETWORK_MESSAGE } from '@/shared/config/messages'
import { ROUTES } from '@/shared/config/routes'

import { CoachAddStudentsPage } from './CoachAddStudentsPage'

// Runs in demo mode as herman (the spec §8): the real create_group and the demo's
// create_account in PGlite, clock at DEMO_NOW. Tests that add something use accounts and
// names that later tests don't depend on.

const MEILING = 'a0000000-0000-4000-8000-000000000002'
const ZULAIKHA = 'a0000000-0000-4000-8000-000000000006'
const FARAH = 'a0000000-0000-4000-8000-000000000003'
const PRIYA = 'a0000000-0000-4000-8000-000000000005'
const KAI = 'a0000000-0000-4000-8000-000000000010'
const DANIEL = 'a0000000-0000-4000-8000-000000000011'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/**
 * Reads of these tables fail as on a lost connection. After `reconnect()` they go through
 * again, but wait for `release()` (a slow connection), so "Try again" can be seen running.
 */
async function loseReads(sources: readonly string[]) {
  const backend = await getBackend()
  const read = backend.read.bind(backend)
  let lost = true
  let release = () => {}
  let released = Promise.resolve()
  vi.spyOn(backend, 'read').mockImplementation(async (source, query) => {
    if (sources.includes(source)) {
      if (lost) throw new TypeError('Failed to fetch')
      await released
    }
    return read(source, query)
  })
  return {
    reconnect() {
      lost = false
      released = new Promise((resolve) => {
        release = resolve
      })
    },
    release: () => release(),
  }
}

// Students & payments, as far as these tests need it: where Add students sends the coach.
function StudentsStub() {
  const location = useLocation()
  return <p>Students page {location.search}</p>
}

// Another page the coach can go to while a save runs.
function SettingsStub() {
  return <p>Settings page</p>
}

/**
 * Holds the demo database in an open transaction, so every call waits (as on a slow
 * connection) until the returned function is called.
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

/** The page alone at `path` for a signed-in account (pages may not import app/). */
function mount(
  session: AuthSession,
  path: string,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const router = createMemoryRouter(
    [
      { path: ROUTES.coachAddStudents, Component: CoachAddStudentsPage },
      { path: ROUTES.coachStudents, Component: StudentsStub },
      { path: ROUTES.coachSettings, Component: SettingsStub },
    ],
    { initialEntries: [path] },
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

/** The page at `path`, signed in as `username`. */
async function renderPage(username: string, path: string = ROUTES.coachAddStudents) {
  return mount(await logIn(username, DEMO_PASSWORD), path)
}

const account = () => screen.getByRole<HTMLSelectElement>('combobox', { name: 'Account' })
const field = (label: string) => screen.getByLabelText<HTMLInputElement>(label)

async function formReady() {
  await screen.findByRole('combobox', { name: 'Account' })
}

/** The form is in, and Add no longer waits for the chosen account's students. */
async function addReady(label: string) {
  await formReady()
  await waitFor(() =>
    expect(screen.getByRole('button', { name: label }).getAttribute('aria-disabled')).toBeNull(),
  )
}

function choose(value: string) {
  fireEvent.change(account(), { target: { value } })
}

function type(label: string, value: string) {
  fireEvent.change(field(label), { target: { value } })
}

function pickType(label: '1-to-1' | '1-to-2' | '1-to-3') {
  fireEvent.click(screen.getByRole('radio', { name: label }))
}

function preview() {
  return screen.getByRole('complementary', { name: 'What the customer sees when booking' })
}

function add(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }))
}

describe('CoachAddStudentsPage', () => {
  it('shows its title at once, then the form with the approved accounts (the spec §8)', async () => {
    await renderPage('herman')
    expect(screen.getByRole('heading', { level: 1, name: 'Add students' })).toBeTruthy()
    const back = screen.getByRole('link', { name: 'Back to Students & payments' })
    expect(back.getAttribute('href')).toBe('/coach/students')
    expect(back.textContent).toBe('Students & payments')
    // Loading: grey blocks, one status, Add looking disabled.
    expect(screen.getByText('Loading…').getAttribute('role')).toBe('status')
    expect(screen.getByRole('button', { name: 'Add student' }).getAttribute('aria-disabled')).toBe(
      'true',
    )
    await formReady()
    await waitFor(() => expect(document.title).toBe('Add students · Swim Class'))

    expect([...account().options].map((option) => option.text)).toEqual([
      'Choose an account',
      'Aina · aina',
      'Daniel · daniel',
      'Ethan · ethan',
      'Farah · farah',
      'Grace · grace',
      'Jun Hao · junhao',
      'Kai · kai',
      'Mei Ling · meiling',
      'Nurul · nurul',
      'Priya · priya',
      'Wei Jie · weijie',
      'Zulaikha · zulaikha',
      'Create a new account…',
    ])
    expect(account().value).toBe('')
    expect(account().options[0].disabled).toBe(true)
    expect(
      screen.getByText(
        'The person who books and pays. A new account gets an email to set its password.',
      ),
    ).toBeTruthy()

    // 1-to-1 to start (C1), the segments and the sentence from settings.
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      '1',
      '2',
      '3',
    ])
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '1-to-1' }).checked).toBe(true)
    expect(screen.getByText('Up to 3 students from the same account per lesson.')).toBeTruthy()
    expect(field('Student 1').placeholder).toBe('e.g. Adam')
    expect(screen.queryByLabelText('Student 2')).toBeNull()
    expect(field('Pool location').placeholder).toBe('e.g. Maple Condo pool')
    expect(screen.getByRole('checkbox', { name: 'First package already paid' })).toBeTruthy()
    expect(screen.getByText('1-to-1 package · 4 lessons · price not set')).toBeTruthy()
    const opening = screen.getByRole('button', { name: 'Set a starting balance' })
    expect(opening.getAttribute('aria-expanded')).toBe('false')
    expect(
      screen.getByText('For students who have already used some lessons of a paid package.'),
    ).toBeTruthy()

    // The preview of 1-to-1, without the note for groups (C11).
    expect(preview().textContent).toBe(
      'What the customer sees when booking' +
        'Student 1 1-to-1' +
        'Books on their own. Each lesson uses 1 lesson from this student’s package.',
    )
    const add = screen.getByRole('button', { name: 'Add student' })
    expect(add.getAttribute('aria-disabled')).toBeNull()
    expect(screen.getByRole('link', { name: 'Cancel' }).getAttribute('href')).toBe(
      '/coach/students',
    )
  })

  it('starts on the account in ?account=, and ignores an id that isn’t one', async () => {
    await renderPage('herman', `${ROUTES.coachAddStudents}?account=${ZULAIKHA}`)
    await formReady()
    expect(account().value).toBe(ZULAIKHA)
    cleanup()
    await renderPage('herman', `${ROUTES.coachAddStudents}?account=nobody`)
    await formReady()
    expect(account().value).toBe('')
  })

  it('follows the lesson type: rows, preview, button and package line', async () => {
    await renderPage('herman')
    await formReady()
    pickType('1-to-3')
    expect(field('Student 2').placeholder).toBe('e.g. Alya')
    expect(field('Student 3').placeholder).toBe('e.g. Amir')
    expect(screen.getByRole('button', { name: 'Add 3 students' })).toBeTruthy()
    expect(screen.getByText('1-to-3 package · 4 lessons · price not set')).toBeTruthy()
    expect(within(preview()).getByText('Student 1, Student 2 & Student 3')).toBeTruthy()
    expect(within(preview()).getByText('1-to-3')).toBeTruthy()
    expect(
      within(preview()).getByText(
        'They always book together, and each lesson uses 1 lesson from their shared package.',
      ),
    ).toBeTruthy()
    expect(
      within(preview()).getByText(
        'To let one of them book alone as well, add that student again as 1-to-1. Each group keeps its own package.',
      ),
    ).toBeTruthy()

    // A hidden row keeps its text, and comes back with it.
    type('Student 3', 'Zara')
    pickType('1-to-2')
    expect(screen.queryByLabelText('Student 3')).toBeNull()
    expect(within(preview()).getByText('Student 1 & Student 2')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add 2 students' })).toBeTruthy()
    pickType('1-to-3')
    expect(field('Student 3').value).toBe('Zara')
    expect(within(preview()).getByText('Zara, Student 1 & Student 2')).toBeTruthy()
  })

  it('shows every problem at once and focuses the first, without saving (scenario 11)', async () => {
    const router = await renderPage('herman')
    await formReady()
    pickType('1-to-2')
    add('Add 2 students')
    expect(screen.getByText('Choose an account, or create a new one.')).toBeTruthy()
    expect(document.activeElement).toBe(account())
    expect(account().getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Type a name for student 1 (up to 100 characters).')).toBeTruthy()
    expect(screen.getByText('Type the pool location (up to 100 characters).')).toBeTruthy()

    choose(ZULAIKHA)
    type('Student 1', 'Hakim')
    type('Student 2', 'x'.repeat(101))
    type('Pool location', '   ')
    add('Add 2 students')
    expect(screen.queryByText('Choose an account, or create a new one.')).toBeNull()
    expect(screen.queryByText('Type a name for student 1 (up to 100 characters).')).toBeNull()
    const second = field('Student 2')
    expect(document.activeElement).toBe(second)
    expect(
      screen.getByLabelText('Student 2', { selector: 'input' }).getAttribute('aria-describedby'),
    ).toContain('add-student-2-error')
    expect(screen.getByText('Type a name for student 2 (up to 100 characters).')).toBeTruthy()
    expect(screen.getByText('Type the pool location (up to 100 characters).')).toBeTruthy()

    // Editing a field takes its message away.
    type('Pool location', 'Maple Condo')
    expect(screen.queryByText('Type the pool location (up to 100 characters).')).toBeNull()
    expect(router.state.location.pathname).toBe(ROUTES.coachAddStudents)
  })

  it('stops a paid first package with no amount while no price is set (scenario 7)', async () => {
    const router = await renderPage('herman', `${ROUTES.coachAddStudents}?account=${ZULAIKHA}`)
    await formReady()
    type('Student 1', 'Nobody')
    type('Pool location', 'Maple Condo')
    fireEvent.click(screen.getByRole('checkbox', { name: 'First package already paid' }))
    expect(field('Amount (RM)').value).toBe('')
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Cash' }).checked).toBe(true)
    add('Add student')
    expect(
      screen.getByText(
        'No price is set for this lesson type. Type the amount, or set the price in Settings.',
      ),
    ).toBeTruthy()
    expect(document.activeElement).toBe(field('Amount (RM)'))

    type('Amount (RM)', '12a')
    add('Add student')
    expect(screen.getByText('Enter the amount in RM, like 240 or 240.50.')).toBeTruthy()
    expect(router.state.location.pathname).toBe(ROUTES.coachAddStudents)
    expect(await readRows('students', { eq: { account_id: ZULAIKHA, name: 'Nobody' } })).toEqual([])
  })

  it('matches typed names to the account’s students and shows their group (scenario 1)', async () => {
    await renderPage('herman', `${ROUTES.coachAddStudents}?account=${ZULAIKHA}`)
    await formReady()
    pickType('1-to-3')
    type('Student 1', 'adam')
    type('Student 2', ' Alya ')
    type('Student 3', 'AMIR')
    type('Pool location', 'Maple Condo')
    await waitFor(() =>
      expect(screen.getByLabelText('Student 1', { selector: 'input' }).getAttribute('list')).toBe(
        'add-students-names',
      ),
    )
    for (const label of ['Student 1', 'Student 2', 'Student 3']) {
      expect(
        screen.getByRole('combobox', { name: label, description: 'Existing student' }),
      ).toBeTruthy()
    }
    expect(within(preview()).getByText('Adam, Alya & Amir')).toBeTruthy()

    add('Add 3 students')
    const message = await screen.findByText(/These students already have an active group\./)
    expect(message.textContent).toBe(
      'These students already have an active group. Use that group, or deactivate it first.',
    )
    expect(within(message).getByRole('link', { name: 'that group' }).getAttribute('href')).toBe(
      '/coach/students?history=c0000000-0000-4000-8000-000000000006',
    )
    expect(document.activeElement).toBe(field('Student 1'))
  })

  it('adds a group with a paid first package, then goes back to the table (scenario 6)', async () => {
    const router = await renderPage('herman', `${ROUTES.coachAddStudents}?account=${FARAH}`)
    await formReady()
    pickType('1-to-2')
    type('Student 1', 'Hana')
    type('Student 2', 'Hadi')
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Student 2', description: 'New student' }),
      ).toBeTruthy(),
    )
    expect(
      screen.getByRole('combobox', { name: 'Student 1', description: 'Existing student' }),
    ).toBeTruthy()
    expect(within(preview()).getByText('Hadi & Hana')).toBeTruthy()
    type('Pool location', 'Sunrise Res.')
    fireEvent.click(screen.getByRole('checkbox', { name: 'First package already paid' }))
    type('Amount (RM)', '0')
    add('Add 2 students')

    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.coachStudents))
    const groupId = new URLSearchParams(router.state.location.search).get('added') ?? ''
    expect(router.state.location.state).toEqual({ added: { groupId, size: 2 } })
    const [group] = await readRows('group_details', { eq: { group_id: groupId } })
    expect(group).toMatchObject({
      account_id: FARAH,
      display_names: 'Hadi & Hana',
      location: 'Sunrise Res.',
    })
    expect(await readRows('payments', { eq: { group_id: groupId } })).toMatchObject([
      { lessons: 4, amount_cents: 0, method: 'cash', paid_on: '2026-09-26' },
    ])
  })

  it('sends the starting balance only while it is open (scenario 9)', async () => {
    const router = await renderPage('herman', `${ROUTES.coachAddStudents}?account=${PRIYA}`)
    await formReady()
    const opening = screen.getByRole('button', { name: 'Set a starting balance' })
    fireEvent.click(opening)
    expect(opening.getAttribute('aria-expanded')).toBe('true')
    type('Lessons already used', '9')
    type('Lessons already paid', '9')
    // Closing it sets both back to 0.
    fireEvent.click(opening)
    expect(opening.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(opening)
    expect(field('Lessons already used').value).toBe('')
    type('Lessons already used', '2a')
    expect(field('Lessons already used').value).toBe('2')
    type('Student 1', 'Arun')
    type('Pool location', 'Seri Maya')
    add('Add student')

    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.coachStudents))
    const groupId = new URLSearchParams(router.state.location.search).get('added') ?? ''
    const [balance] = await readRows('group_balance', { eq: { group_id: groupId } })
    expect(balance).toMatchObject({
      used_lessons: 2,
      paid_lessons: 0,
      unpaid: true,
      can_still_book: 2,
    })
  })

  it('checks a new account’s username as they type', async () => {
    await renderPage('herman')
    await formReady()
    choose('new')
    const fields = screen.getByRole('group', { name: 'New account' })
    expect(within(fields).getByLabelText('Name')).toBeTruthy()
    expect(within(fields).getByLabelText('Email').getAttribute('type')).toBe('email')
    expect(within(fields).getByLabelText('Phone (optional)').getAttribute('type')).toBe('tel')
    type('Username', 'zulaikha')
    expect(await screen.findByText('That username is taken.', {}, { timeout: 3000 })).toBeTruthy()
    // The field shows what is checked and sent: lowercased, without spaces, as on Sign up.
    type('Username', 'Siti.Rahman')
    expect(field('Username').value).toBe('siti.rahman')
    expect(await screen.findByText('Available', {}, { timeout: 3000 })).toBeTruthy()
    type('Username', 'Has Space')
    expect(field('Username').value).toBe('hasspace')
    type('Username', 'ab')
    expect(
      await screen.findByText(
        'Use 3 to 30 lowercase letters, numbers, dots or underscores.',
        {},
        { timeout: 3000 },
      ),
    ).toBeTruthy()
  })

  it('creates the account, then its group (scenario 12)', async () => {
    const router = await renderPage('herman')
    await formReady()
    choose('new')
    type('Name', 'Siti Rahman')
    type('Username', 'Siti.Rahman')
    expect(field('Username').value).toBe('siti.rahman')
    type('Email', 'siti@example.com')
    type('Phone (optional)', '012-345 6789')
    type('Student 1', 'Aisyah')
    type('Pool location', 'Palm Court')
    add('Add student')

    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.coachStudents), {
      timeout: 3000,
    })
    const groupId = new URLSearchParams(router.state.location.search).get('added') ?? ''
    expect(router.state.location.state).toEqual({
      added: { groupId, size: 1, invitedEmail: 'siti@example.com' },
    })
    const [profile] = await readRows('profiles', { eq: { username: 'siti.rahman' } })
    expect(profile).toMatchObject({
      display_name: 'Siti Rahman',
      phone: '012-345 6789',
      approved: true,
    })
    const [group] = await readRows('group_details', { eq: { group_id: groupId } })
    expect(group).toMatchObject({ account_id: profile?.id, display_names: 'Aisyah' })
  })

  it('keeps the new account when its group is refused, and then only adds the group', async () => {
    const router = await renderPage('herman')
    await formReady()
    choose('new')
    type('Name', 'Rina Tan')
    type('Username', 'rina.tan')
    type('Email', 'rina@example.com')
    pickType('1-to-2')
    type('Student 1', 'Ali')
    type('Student 2', 'Bala')
    type('Pool location', 'Kiara Park')
    // Settings change while the form is open: a lesson now takes one student.
    await rpc('update_settings', { p_settings: { max_students_per_lesson: 1 } })
    try {
      add('Add 2 students')
      expect(
        await screen.findByText(
          'A lesson can have up to 1 student. Remove one, or change “Students per lesson” in Settings.',
          {},
          { timeout: 3000 },
        ),
      ).toBeTruthy()
      expect(screen.getByText('Account created for Rina Tan.')).toBeTruthy()
      const [rina] = await readRows('profiles', { eq: { username: 'rina.tan' } })
      expect(account().value).toBe(rina?.id)
      expect(account().selectedOptions[0]?.text).toBe('Rina Tan · rina.tan')
      expect(screen.queryByRole('group', { name: 'New account' })).toBeNull()
      // The fresh settings leave one segment; the type follows.
      await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(1))
      expect(document.activeElement).toBe(screen.getByRole('radio', { name: '1-to-1' }))

      add('Add student')
      await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.coachStudents))
      const groupId = new URLSearchParams(router.state.location.search).get('added') ?? ''
      expect(router.state.location.state).toEqual({
        added: { groupId, size: 1, invitedEmail: 'rina@example.com' },
      })
      expect(await readRows('profiles', { eq: { display_name: 'Rina Tan' } })).toHaveLength(1)
    } finally {
      await act(() => rpc('update_settings', { p_settings: { max_students_per_lesson: 3 } }))
    }
  })

  it('waits for the account’s students before it adds anything (the spec §5.3)', async () => {
    const session = await logIn('herman', DEMO_PASSWORD)
    // Settings and accounts are already read; the students are on their way.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const [settings] = await readRows('settings', { eq: { id: 1 } })
    queryClient.setQueryData(settingsKeys.coach(), settings)
    queryClient.setQueryData(
      accountKeys.customers(),
      await readRows('profiles', { eq: { role: 'customer' } }),
    )
    const release = await holdDatabase()
    try {
      mount(session, `${ROUTES.coachAddStudents}?account=${ZULAIKHA}`, queryClient)
      await formReady()
      const add = screen.getByRole('button', { name: 'Add student' })
      expect(add.getAttribute('aria-disabled')).toBe('true')
      // Pressing it sends nothing: a typed "Adam" would otherwise go as a new student.
      type('Student 1', 'Adam')
      fireEvent.click(add)
      expect(screen.queryByText('Type the pool location (up to 100 characters).')).toBeNull()
    } finally {
      await release()
    }
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Add student' }).getAttribute('aria-disabled'),
      ).toBeNull(),
    )
    expect(
      screen.getByRole('combobox', { name: 'Student 1', description: 'Existing student' }),
    ).toBeTruthy()
  })

  it('saves once, Add busy with its label kept, however often it is pressed (the spec §6)', async () => {
    const router = await renderPage('herman', `${ROUTES.coachAddStudents}?account=${KAI}`)
    await addReady('Add student')
    type('Student 1', 'Twice')
    type('Pool location', 'Palm Court')
    const button = screen.getByRole('button', { name: 'Add student' })
    const release = await holdDatabase()
    try {
      // Two presses before React draws again, then one more while it saves.
      act(() => {
        fireEvent.click(button)
        fireEvent.click(button)
      })
      expect(button.getAttribute('aria-busy')).toBe('true')
      expect(button.getAttribute('aria-disabled')).toBe('true')
      expect(button.textContent).toBe('Add student')
      fireEvent.click(button)
      // The fields stay editable.
      expect(field('Pool location').disabled).toBe(false)
    } finally {
      await release()
    }
    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.coachStudents))
    expect(
      await readRows('group_details', { eq: { account_id: KAI, display_names: 'Twice' } }),
    ).toHaveLength(1)
  })

  it('shows a refusal that belongs to no field above the buttons, keeping everything', async () => {
    const router = await renderPage('herman', `${ROUTES.coachAddStudents}?account=${KAI}`)
    await addReady('Add student')
    type('Student 1', 'Lost')
    type('Pool location', 'Palm Court')
    // The session ends behind the form: create_group, run as nobody, answers unknown.
    await logOut()
    add('Add student')
    const alert = await screen.findByRole('alert')
    expect(alert.id).toBe('add-form-error')
    expect(alert.textContent).toBe('Something went wrong. Refresh the page and try again.')
    expect(field('Student 1').value).toBe('Lost')
    expect(field('Pool location').value).toBe('Palm Court')
    expect(router.state.location.pathname).toBe(ROUTES.coachAddStudents)
  })

  it('works the checkbox and the segments with Enter, as Space does (the spec §7)', async () => {
    const router = await renderPage('herman')
    await formReady()
    const paid = screen.getByRole<HTMLInputElement>('checkbox', {
      name: 'First package already paid',
    })
    // fireEvent answers false when the default, the browser submitting the form, is stopped.
    expect(fireEvent.keyDown(paid, { key: 'Enter' })).toBe(false)
    expect(paid.checked).toBe(true)
    expect(field('Amount (RM)')).toBeTruthy()
    expect(fireEvent.keyDown(paid, { key: 'Enter', repeat: true })).toBe(false)
    expect(paid.checked).toBe(true)
    expect(fireEvent.keyDown(paid, { key: 'Enter' })).toBe(false)
    expect(paid.checked).toBe(false)

    const three = screen.getByRole<HTMLInputElement>('radio', { name: '1-to-3' })
    expect(fireEvent.keyDown(three, { key: 'Enter' })).toBe(false)
    expect(three.checked).toBe(true)
    expect(field('Student 3')).toBeTruthy()
    expect(fireEvent.keyDown(three, { key: 'Enter' })).toBe(false)
    expect(three.checked).toBe(true)

    // Enter in a text field still submits, and other keys are left alone.
    expect(fireEvent.keyDown(field('Pool location'), { key: 'Enter' })).toBe(true)
    expect(fireEvent.keyDown(paid, { key: 'a' })).toBe(true)
    expect(screen.queryByText('Choose an account, or create a new one.')).toBeNull()
    expect(router.state.location.pathname).toBe(ROUTES.coachAddStudents)
  })

  it('goes back to “Choose an account” when the chosen account leaves the list', async () => {
    await renderPage('herman')
    await formReady()
    choose(MEILING)
    type('Student 1', 'Sofia')
    type('Pool location', 'Palm Court')
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Student 1', description: 'Existing student' }),
      ).toBeTruthy(),
    )
    // Mei Ling stops being a customer behind the form: create_group refuses (not_customer)
    // and the list is read again without her.
    const db = await demoDb()
    await db.query(`update public.profiles set role = 'coach' where id = $1`, [MEILING])
    try {
      add('Add student')
      expect((await screen.findByRole('alert')).textContent).toBe(
        'Something went wrong. Refresh the page and try again.',
      )
      await waitFor(() => expect(account().value).toBe(''))
      expect(account().selectedOptions[0]?.text).toBe('Choose an account')
      expect(screen.queryByText('Existing student')).toBeNull()
      expect(field('Student 1').getAttribute('list')).toBeNull()

      add('Add student')
      expect(screen.getByText('Choose an account, or create a new one.')).toBeTruthy()
      expect(document.activeElement).toBe(account())
    } finally {
      await db.query(`update public.profiles set role = 'customer' where id = $1`, [MEILING])
    }
  })

  it('stays where the coach went when they leave while Add saves', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const session = await logIn('herman', DEMO_PASSWORD)
    const router = mount(session, `${ROUTES.coachAddStudents}?account=${DANIEL}`, queryClient)
    await addReady('Add student')
    type('Student 1', 'Dan Two')
    type('Pool location', 'Kiara Park')
    const release = await holdDatabase()
    try {
      add('Add student')
      await act(() => router.navigate(ROUTES.coachSettings))
      expect(screen.getByText('Settings page')).toBeTruthy()
    } finally {
      await release()
    }
    // The save completes, and the coach stays on Settings.
    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(
      await readRows('group_details', { eq: { account_id: DANIEL, display_names: 'Dan Two' } }),
    ).toHaveLength(1)
    expect(router.state.location.pathname).toBe(ROUTES.coachSettings)
    expect(screen.getByText('Settings page')).toBeTruthy()
  })

  it('says what went wrong, with Try again, when the form can’t load', async () => {
    // A customer can't read the coach's settings (RLS): the page shows the problem.
    await renderPage('meiling')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Something went wrong. Refresh the page and try again.')
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Add students' })).toBeTruthy()
  })

  it('keeps Try again busy and focused while the form’s reads run again, then focus goes to Account', async () => {
    const settings = await loseReads(['settings'])
    await renderPage('herman')
    const alert = await screen.findByRole('alert', {}, { timeout: 4000 })
    expect(alert.textContent).toContain(NETWORK_MESSAGE)

    settings.reconnect()
    const retry = within(alert).getByRole('button', { name: 'Try again' })
    retry.focus()
    fireEvent.click(retry)
    await waitFor(() => expect(retry.getAttribute('aria-busy')).toBe('true'))
    expect(document.activeElement).toBe(retry)
    expect(screen.queryByText('Loading…')).toBeNull()

    settings.release()
    await formReady()
    expect(screen.queryByRole('alert')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(account()))
  })

  it('keeps the students’ Try again focused while they are read again, then focus goes to Account', async () => {
    const students = await loseReads(['students'])
    await renderPage('herman', `${ROUTES.coachAddStudents}?account=${MEILING}`)
    await formReady()
    const alert = await screen.findByRole('alert', {}, { timeout: 4000 })
    expect(alert.textContent).toContain(NETWORK_MESSAGE)

    students.reconnect()
    const retry = within(alert).getByRole('button', { name: 'Try again' })
    retry.focus()
    fireEvent.click(retry)
    await waitFor(() => expect(retry.getAttribute('aria-busy')).toBe('true'))
    expect(document.activeElement).toBe(retry)

    students.release()
    await addReady('Add student')
    expect(screen.queryByRole('alert')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(account()))
  })
})
