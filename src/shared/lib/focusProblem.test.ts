import { afterEach, describe, expect, it, vi } from 'vitest'

import { focusProblem } from './focusProblem'

/** A form with two fields and a button, in the page. */
function form() {
  document.body.innerHTML = `
    <form>
      <input id="name" />
      <input id="email" />
      <button type="submit">Send</button>
    </form>`
  const field = (id: string) => document.getElementById(id) as HTMLInputElement
  return { name: field('name'), email: field('email'), button: document.querySelector('button')! }
}

const alerts = () => [...document.querySelectorAll('[role="alert"]')]

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('focusProblem', () => {
  it('moves focus to the field, which is then read out with its message, and says nothing more', () => {
    const { email, button } = form()
    button.focus()
    focusProblem(email, 'Enter an email address like name@example.com.')
    expect(document.activeElement).toBe(email)
    expect(alerts()).toEqual([])
  })

  it('says the message once, as an alert at the end of the form, when the field has focus', () => {
    vi.useFakeTimers()
    const { name } = form()
    name.focus()
    focusProblem(name, 'Enter your name.')
    expect(document.activeElement).toBe(name)
    const [line] = alerts()
    expect(line.textContent).toBe('Enter your name.')
    expect(line.className).toBe('sr-only')
    expect(line.parentElement).toBe(name.form)
    expect(name.form?.lastElementChild).toBe(line)

    // Pressed again: a new alert, so it is read out again, in place of the last one.
    focusProblem(name, 'Enter your name.')
    expect(alerts()).toHaveLength(1)
    expect(alerts()[0]).not.toBe(line)

    // It goes after a while.
    vi.advanceTimersByTime(7_000)
    expect(alerts()).toEqual([])
  })

  it('does nothing without a field', () => {
    form()
    focusProblem(null, 'Enter your name.')
    focusProblem(undefined, 'Enter your name.')
    expect(alerts()).toEqual([])
  })
})
