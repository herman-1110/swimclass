import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import type { EditableGroup } from '../model/types'
import { EditGroupButton } from './EditGroupButton'

// Demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00 MYT.
const NURUL: EditableGroup = {
  group_id: 'c0000000-0000-4000-8000-000000000013',
  display_names: 'Nurul',
  size: 1,
  location: 'Seri Maya',
  opening_used_lessons: 2,
  opening_paid_lessons: 4,
  active: true,
}

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function openDialog(group: EditableGroup = NURUL, accountName = 'Nurul') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onSaved = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <EditGroupButton group={group} accountName={accountName} onSaved={onSaved} />
    </QueryClientProvider>,
  )
  const button = screen.getByRole('button', { name: 'Edit group' })
  expect(button.getAttribute('aria-haspopup')).toBe('dialog')
  fireEvent.click(button)
  const dialog = screen.getByRole('dialog', { name: 'Edit group' })
  return { dialog, onSaved }
}

const field = (dialog: HTMLElement, name: string) =>
  within(dialog).getByLabelText<HTMLInputElement>(name)
const saveIn = (dialog: HTMLElement) => within(dialog).getByRole('button', { name: 'Save changes' })

describe('EditGroupButton', () => {
  it('opens Edit group with the group’s pool and starting balance', () => {
    const { dialog } = openDialog(
      { ...NURUL, display_names: 'Hana', location: 'Sunrise Res.' },
      'Farah',
    )
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy()
    expect(within(dialog).getByText('Hana · Farah’s account')).toBeTruthy()
    expect(field(dialog, 'Pool location').value).toBe('Sunrise Res.')
    expect(
      within(dialog).getByRole('textbox', {
        name: 'Pool location',
        description: 'Upcoming lessons move to the new location.',
      }),
    ).toBeTruthy()
    expect(within(dialog).getByRole('group', { name: 'Starting balance' })).toBeTruthy()
    expect(field(dialog, 'Lessons already used').value).toBe('2')
    expect(field(dialog, 'Lessons already paid').value).toBe('4')
    expect(field(dialog, 'Lessons already paid').getAttribute('inputmode')).toBe('numeric')
  })

  it('just closes when nothing changed', () => {
    const { dialog, onSaved } = openDialog()
    fireEvent.click(saveIn(dialog))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('saves what changed, closes and says "Changes saved"', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { dialog, onSaved } = openDialog()
    fireEvent.change(field(dialog, 'Lessons already used'), { target: { value: '3' } })
    fireEvent.change(field(dialog, 'Lessons already paid'), { target: { value: '5' } })
    fireEvent.click(saveIn(dialog))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Changes saved'))
    expect(screen.queryByRole('dialog')).toBeNull()
    const [nurul] = await readRows('group_details', { eq: { group_id: NURUL.group_id } })
    expect(nurul).toMatchObject({ opening_used_lessons: 3, opening_paid_lessons: 5 })
  })

  it('shows a refused pool at the field, with focus there', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const { dialog } = openDialog()
    const location = field(dialog, 'Pool location')
    fireEvent.change(location, { target: { value: '   ' } })
    fireEvent.click(saveIn(dialog))
    await waitFor(() => expect(location.getAttribute('aria-invalid')).toBe('true'))
    expect(document.getElementById(`${location.id}-error`)?.textContent).toBe(
      'Type the pool location (up to 100 characters).',
    )
    expect(document.activeElement).toBe(location)
  })

  it('keeps only the digits typed in the starting balance', () => {
    const { dialog } = openDialog()
    const used = field(dialog, 'Lessons already used')
    const paid = field(dialog, 'Lessons already paid')
    fireEvent.change(used, { target: { value: '1.5' } })
    expect(used.value).toBe('15')
    fireEvent.change(used, { target: { value: '-1' } })
    expect(used.value).toBe('1')
    fireEvent.change(paid, { target: { value: 'abc' } })
    expect(paid.value).toBe('')
    expect(used.getAttribute('aria-invalid')).toBeNull()
  })

  it('closes on Cancel', () => {
    openDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
