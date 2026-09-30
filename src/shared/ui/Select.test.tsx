import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Select } from './Select'

afterEach(cleanup)

const accounts = [
  { value: '', label: 'Choose an account', disabled: true },
  { value: 'zulaikha', label: 'Zulaikha · zulaikha' },
  { value: 'meiling', label: 'Mei Ling · meiling' },
] as const

describe('Select', () => {
  it('is a labelled native select with the options it is given', () => {
    render(<Select label="Account" options={accounts} defaultValue="" />)
    const select = screen.getByRole('combobox', { name: 'Account' })
    expect(select.tagName).toBe('SELECT')
    const options = screen.getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'Choose an account',
      'Zulaikha · zulaikha',
      'Mei Ling · meiling',
    ])
    expect(options[0].hasAttribute('disabled')).toBe(true)
  })

  it('reports the chosen value', () => {
    const onChange = vi.fn((event: { target: { value: string } }) => event.target.value)
    render(<Select label="Account" options={accounts} defaultValue="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Account' }), {
      target: { value: 'meiling' },
    })
    expect(onChange).toHaveReturnedWith('meiling')
  })

  it('links help and error text and marks the select invalid', () => {
    render(
      <Select
        id="add-account"
        label="Account"
        help="The person who books and pays."
        error="Choose an account, or create a new one."
        options={accounts}
      />,
    )
    const select = screen.getByRole('combobox', { name: 'Account' })
    expect(select.getAttribute('aria-describedby')).toBe('add-account-help add-account-error')
    expect(select.getAttribute('aria-invalid')).toBe('true')
  })

  it('can be labelled by a settings row and disabled', () => {
    render(
      <>
        <label htmlFor="set-expiry">Unused lessons expire</label>
        <Select id="set-expiry" size="row" disabled options={[{ value: '', label: 'Never' }]} />
      </>,
    )
    const select = screen.getByRole('combobox', { name: 'Unused lessons expire' })
    expect(select.hasAttribute('disabled')).toBe(true)
    expect(select.className).toContain('rounded-small')
  })
})
