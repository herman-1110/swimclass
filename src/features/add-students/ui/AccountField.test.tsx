import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CustomerAccount } from '@/entities/account'
import { AppError } from '@/shared/api/rpc'

import { AccountField } from './AccountField'

afterEach(cleanup)

const meiling: CustomerAccount = {
  id: 'a0000000-0000-4000-8000-000000000002',
  username: 'meiling',
  display_name: 'Mei Ling',
  phone: null,
  role: 'customer',
  approved: true,
  created_at: '2026-09-26T04:00:00+00:00',
}

describe('AccountField', () => {
  it('lists the accounts between the placeholder and "Create a new account…"', () => {
    render(
      <AccountField
        accounts={[meiling]}
        value=""
        onChange={() => {}}
        notice={null}
        studentsError={null}
      />,
    )
    const select = screen.getByRole<HTMLSelectElement>('combobox', {
      name: 'Account',
      description:
        'The person who books and pays. A new account gets an email to set its password.',
    })
    expect([...select.options].map((option) => [option.value, option.text])).toEqual([
      ['', 'Choose an account'],
      [meiling.id, 'Mei Ling · meiling'],
      ['new', 'Create a new account…'],
    ])
  })

  it('says when the account was just created, linked to the select', () => {
    render(
      <AccountField
        accounts={[meiling]}
        value={meiling.id}
        onChange={() => {}}
        notice="Account created for Mei Ling."
        studentsError={null}
      />,
    )
    const status = screen.getByRole('status')
    expect(status.textContent).toBe('Account created for Mei Ling.')
    expect(
      screen.getByRole('combobox', { name: 'Account' }).getAttribute('aria-describedby'),
    ).toContain(status.id)
  })

  it('says when the students couldn’t be read, with Try again', () => {
    const retry = vi.fn()
    render(
      <AccountField
        accounts={[meiling]}
        value={meiling.id}
        onChange={() => {}}
        notice={null}
        studentsError={{ error: new AppError('network'), retry }}
      />,
    )
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain(
      'Couldn’t reach the server. Check your connection and try again.',
    )
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
