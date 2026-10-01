import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { GroupActiveButton } from './GroupActiveButton'

// Demo mode: the real migrations and seed in PGlite, clock at Sat 26 Sep 2026 12:00 MYT.
// Every seed group has lessons ahead, so the tests make groups of their own.
const HANA = { group_id: 'c0000000-0000-4000-8000-000000000003', display_names: 'Hana' }
const ZULAIKHA = 'a0000000-0000-4000-8000-000000000006'

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

function renderButton(group: { group_id: string; display_names: string; active: boolean }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onChanged = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GroupActiveButton group={group} onChanged={onChanged} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { onChanged }
}

async function newGroup(name: string) {
  return rpc('create_group', {
    p_account_id: ZULAIKHA,
    p_students: [{ name }],
    p_location: 'Maple Condo',
  })
}

describe('GroupActiveButton', () => {
  it('asks before deactivating, and keeps only Cancel after the database refuses', async () => {
    await logIn('herman', DEMO_PASSWORD)
    renderButton({ ...HANA, active: true })
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate group' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Deactivate Hana?' })
    expect(dialog.textContent).toContain(
      'They can’t book until you reactivate the group. Their packages and history stay.',
    )
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' })
    expect(document.activeElement).toBe(cancel)
    const deactivate = within(dialog).getByRole('button', { name: 'Deactivate group' })
    fireEvent.click(deactivate)
    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      'This group has 2 upcoming lessons. Cancel them first, then deactivate it. Each cancellation emails the customer.',
    )
    expect(deactivate.getAttribute('aria-disabled')).toBe('true')
    expect(document.activeElement).toBe(cancel)
    fireEvent.click(cancel)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('deactivates a group with nothing ahead', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const groupId = await newGroup('Hakim')
    const { onChanged } = renderButton({ group_id: groupId, display_names: 'Hakim', active: true })
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate group' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Deactivate Hakim?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate group' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith('Group deactivated'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    const [group] = await readRows('group_details', { eq: { group_id: groupId } })
    expect(group?.active).toBe(false)
  })

  it('reactivates at once', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const groupId = await newGroup('Zara')
    await rpc('set_group_active', { p_group_id: groupId, p_active: false })
    const { onChanged } = renderButton({ group_id: groupId, display_names: 'Zara', active: false })
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate group' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith('Group reactivated'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('links to the group that already has these students when it can’t reactivate', async () => {
    await logIn('herman', DEMO_PASSWORD)
    const first = await newGroup('Iman')
    await rpc('set_group_active', { p_group_id: first, p_active: false })
    const [old] = await readRows('group_details', { eq: { group_id: first } })
    const second = await rpc('create_group', {
      p_account_id: ZULAIKHA,
      p_students: [{ student_id: old?.student_ids?.[0] }],
      p_location: 'Maple Condo',
    })
    renderButton({ group_id: first, display_names: 'Iman', active: false })
    const button = screen.getByRole('button', { name: 'Reactivate group' })
    fireEvent.click(button)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(
      'These students already have an active group. Use that group, or deactivate it first.',
    )
    expect(within(alert).getByRole('link', { name: 'that group' }).getAttribute('href')).toBe(
      `/coach/students?history=${second}`,
    )
    expect(button.getAttribute('aria-describedby')).toBe(alert.id)
  })
})
