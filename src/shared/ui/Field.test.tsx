import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Field } from './Field'

afterEach(cleanup)

const describedBy = (element: HTMLElement) => element.getAttribute('aria-describedby')?.split(' ')

describe('Field', () => {
  it('names the input with a real label', () => {
    render(<Field label="Pool location" placeholder="e.g. Maple Condo pool" />)
    const input = screen.getByRole('textbox', { name: 'Pool location' })
    expect(screen.getByLabelText('Pool location')).toBe(input)
    expect(input.getAttribute('type')).toBe('text')
    expect(input.hasAttribute('aria-describedby')).toBe(false)
    expect(input.hasAttribute('aria-invalid')).toBe(false)
  })

  it('keeps an id the caller passes, as the drawings name them', () => {
    render(<Field id="login-username" size="lg" label="Username" autoComplete="username" />)
    const input = screen.getByRole('textbox', { name: 'Username' })
    expect(input.id).toBe('login-username')
    expect(input.getAttribute('autocomplete')).toBe('username')
  })

  it('links the help, status and error text, in that order, and marks the input invalid', () => {
    render(
      <Field
        id="signup-username"
        label="Username"
        help="Lowercase letters and numbers."
        status="Checking…"
        error="That username is taken."
      />,
    )
    const input = screen.getByRole('textbox', { name: 'Username' })
    expect(describedBy(input)).toEqual([
      'signup-username-help',
      'signup-username-status',
      'signup-username-error',
    ])
    expect(document.getElementById('signup-username-help')?.textContent).toBe(
      'Lowercase letters and numbers.',
    )
    expect(document.getElementById('signup-username-error')?.textContent).toBe(
      'That username is taken.',
    )
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  it('keeps the status region in place, polite, before its first message', () => {
    const { rerender } = render(<Field id="u" label="Username" status={null} />)
    const region = document.getElementById('u-status')
    expect(region?.getAttribute('aria-live')).toBe('polite')
    expect(region?.textContent).toBe('')
    // An empty region describes nothing.
    expect(screen.getByRole('textbox', { name: 'Username' }).hasAttribute('aria-describedby')).toBe(
      false,
    )
    rerender(<Field id="u" label="Username" status="That username is available." />)
    expect(document.getElementById('u-status')).toBe(region)
    expect(region?.textContent).toBe('That username is available.')
    expect(describedBy(screen.getByRole('textbox', { name: 'Username' }))).toEqual(['u-status'])
  })

  it('adds its own descriptions after the ones the caller passes', () => {
    render(
      <>
        <label htmlFor="set-gap">Travel gap</label>
        <span id="set-gap-help">Blocked before and after every lesson</span>
        <Field
          id="set-gap"
          size="row"
          width="number"
          align="end"
          unit="min"
          aria-describedby="set-gap-help"
          defaultValue="60"
        />
      </>,
    )
    const input = screen.getByRole('textbox', { name: 'Travel gap' })
    expect(describedBy(input)).toEqual(['set-gap-help', 'set-gap-unit'])
    expect(document.getElementById('set-gap-unit')?.textContent).toBe('min')
    expect(input.className).toContain('text-right')
    expect(input.className).toContain('w-16')
  })

  it('is invalid when the caller says so, with the message shown elsewhere', () => {
    render(<Field label="Booking window" aria-invalid />)
    expect(
      screen.getByRole('textbox', { name: 'Booking window' }).getAttribute('aria-invalid'),
    ).toBe('true')
  })

  it('describes a prefixed input with its prefix, inside one box', () => {
    render(<Field id="pay-amount" label="Amount" prefix="RM" inputMode="decimal" />)
    const input = screen.getByRole('textbox', { name: 'Amount' })
    expect(describedBy(input)).toEqual(['pay-amount-prefix'])
    expect(document.getElementById('pay-amount-prefix')?.textContent).toBe('RM')
    expect(input.getAttribute('inputmode')).toBe('decimal')
    expect(input.parentElement?.className).toContain('focus-within:outline-accent')
  })

  it('is a search box with a label only screen readers get', () => {
    render(<Field type="search" size="sm" label="Search students" hideLabel />)
    const input = screen.getByRole('searchbox', { name: 'Search students' })
    expect(input.getAttribute('enterkeyhint')).toBe('search')
    expect(screen.getByText('Search students').className).toBe('sr-only')
  })

  it('puts the label beside the input in the inline layout', () => {
    render(<Field id="add-student-1" layout="inline" label="Student 1" placeholder="e.g. Adam" />)
    const input = screen.getByRole('textbox', { name: 'Student 1' })
    const label = screen.getByText('Student 1')
    expect(label.tagName).toBe('LABEL')
    expect(label.parentElement).toBe(input.parentElement?.parentElement)
  })

  it('passes typing through to the caller', () => {
    const onChange = vi.fn()
    render(<Field label="Pool location" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Pool location' }), {
      target: { value: 'Palm Court' },
    })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('can be disabled or read-only', () => {
    render(
      <>
        <Field label="Unused lessons" disabled />
        <Field label="Email" readOnly defaultValue="meiling@example.com" />
      </>,
    )
    expect(screen.getByRole('textbox', { name: 'Unused lessons' }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(screen.getByRole('textbox', { name: 'Email' }).hasAttribute('readonly')).toBe(true)
  })
})
