import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getSession, logIn, logOut } from '@/shared/api/auth'
import { readRows } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { MessageAllCustomers } from './MessageAllCustomers'

// Runs in demo mode: the real migrations and seed in PGlite. The seed has no messages;
// messages sent here stay for later tests in this file.

const SLOW = { timeout: 4000 }

beforeAll(async () => {
  // Load the demo database here (about 4 s in jsdom), not inside the first test's 5 s.
  await logOut()
  await getSession()
}, 60_000)

afterEach(cleanup)

async function renderSection() {
  await logIn('herman', DEMO_PASSWORD)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onSent = vi.fn()
  const onRemoved = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <MessageAllCustomers onSent={onSent} onRemoved={onRemoved} />
    </QueryClientProvider>,
  )
  const section = screen.getByRole('region', { name: 'Message all customers' })
  return { section, onSent, onRemoved }
}

function send(section: HTMLElement) {
  return within(section).getByRole('button', { name: /^Send to all customers|^Sending/ })
}

describe('MessageAllCustomers', () => {
  it('names the box by its title, as drawn, and waits for some text (§3.7, §6.3)', async () => {
    const { section } = await renderSection()
    const box = within(section).getByRole('textbox', {
      name: 'Message all customers',
      description: 'Sent by email and shown in the app',
    })
    expect(box.getAttribute('maxlength')).toBe('1000')
    expect(box.getAttribute('rows')).toBe('4')
    expect(box.getAttribute('placeholder')).toBe(
      'e.g. Pool maintenance on Saturday morning. Those lessons move to 4 pm.',
    )
    expect(
      within(section).getByRole('checkbox', { name: 'Pin as a banner until I remove it' }),
    ).toHaveProperty('checked', true)
    expect(send(section).getAttribute('aria-disabled')).toBe('true')
    fireEvent.change(box, { target: { value: '   ' } })
    expect(send(section).getAttribute('aria-disabled')).toBe('true')
    // No pinned messages in the seed: no list.
    expect(within(section).queryByRole('heading', { name: 'Pinned messages' })).toBeNull()
  })

  it('sends and pins the message, then clears the form and lists it (§8.3)', async () => {
    const { section, onSent } = await renderSection()
    const box = within(section).getByRole('textbox', { name: 'Message all customers' })
    fireEvent.change(box, {
      target: { value: 'Pool maintenance on Saturday morning. Those lessons move to 4 pm.' },
    })
    expect(send(section).getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(send(section))
    await waitFor(() => expect(onSent).toHaveBeenCalledWith('Sent to all customers.'), SLOW)
    expect((box as HTMLTextAreaElement).value).toBe('')
    const list = await within(section).findByRole('list', { name: 'Pinned messages' }, SLOW)
    const [item] = within(list).getAllByRole('listitem')
    expect(item.textContent).toMatch(
      /^Pool maintenance on Saturday morning\. Those lessons move to 4 pm\.Posted \w{3} \d{1,2} \w{3} · Customers see this one/,
    )
    const [row] = await readRows('announcements', {})
    expect(row).toMatchObject({ pinned: true, send_email: true, removed_at: null })
  })

  it('emails without pinning when the box is unchecked', async () => {
    const { section, onSent } = await renderSection()
    await within(section).findByRole('list', { name: 'Pinned messages' }, SLOW)
    fireEvent.change(within(section).getByRole('textbox', { name: 'Message all customers' }), {
      target: { value: 'Not a banner' },
    })
    const pin = within(section).getByRole('checkbox', { name: 'Pin as a banner until I remove it' })
    fireEvent.click(pin)
    fireEvent.click(send(section))
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1), SLOW)
    expect(pin).toHaveProperty('checked', true)
    const rows = await readRows('announcements', { eq: { message: 'Not a banner' } })
    expect(rows).toEqual([expect.objectContaining({ pinned: false, send_email: true })])
    expect(within(section).queryByText('Not a banner')).toBeNull()
  })

  it('says which pinned message customers see, and removes one after asking', async () => {
    const { section, onSent, onRemoved } = await renderSection()
    fireEvent.change(within(section).getByRole('textbox', { name: 'Message all customers' }), {
      target: { value: 'Newer message' },
    })
    fireEvent.click(send(section))
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1), SLOW)
    const list = await within(section).findByRole('list', { name: 'Pinned messages' }, SLOW)
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(2), SLOW)
    const [newer, older] = within(list).getAllByRole('listitem')
    expect(newer.textContent).toContain('Newer message')
    expect(newer.textContent).toContain('Customers see this one')
    expect(older.textContent).toContain('Shows again if you remove the newer ones')

    fireEvent.click(within(newer).getByRole('button', { name: /^Remove message posted / }))
    const dialog = screen.getByRole('alertdialog', {
      name: 'Remove this message?',
      description: 'Customers stop seeing the banner. Emails already sent or queued still go out.',
    })
    expect(document.activeElement).toBe(
      within(dialog).getByRole('button', { name: 'Keep message' }),
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove message' }))
    await waitFor(() => expect(onRemoved).toHaveBeenCalledWith('Message removed.'), SLOW)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1), SLOW)
    expect(within(list).getByRole('listitem').textContent).toContain('Customers see this one')
  })
})
