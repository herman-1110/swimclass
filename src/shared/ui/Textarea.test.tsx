import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Textarea } from './Textarea'

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})

describe('Textarea', () => {
  it('names the box with its label and gives the form look two rows', () => {
    render(<Textarea label="Note (optional)" placeholder="e.g. Paid by Farah at the pool" />)
    const box = screen.getByRole('textbox', { name: 'Note (optional)' })
    expect(box.tagName).toBe('TEXTAREA')
    expect(box.getAttribute('rows')).toBe('2')
    expect(box.className).toContain('resize-none')
  })

  it('can be named by its section title, with the drawn line above it as the description', () => {
    render(
      <section aria-labelledby="msg-title">
        <h2 id="msg-title">Message all customers</h2>
        <Textarea
          id="announce-text"
          look="message"
          aria-labelledby="msg-title"
          help="Sent by email and shown in the app"
          maxLength={1000}
        />
      </section>,
    )
    const box = screen.getByRole('textbox', { name: 'Message all customers' })
    expect(box.getAttribute('aria-describedby')).toBe('announce-text-help')
    expect(box.getAttribute('rows')).toBe('4')
    expect(box.getAttribute('maxlength')).toBe('1000')
    // The message look shows the line above the box, as drawn.
    const help = document.getElementById('announce-text-help')
    expect(help?.textContent).toBe('Sent by email and shown in the app')
    expect(help?.nextElementSibling).toBe(box)
  })

  it('shows help under the box in the other looks, and an error after it', () => {
    render(
      <Textarea
        id="note"
        label="Note (optional)"
        help="Only you see this."
        error="The note is too long. Shorten it to 500 characters."
      />,
    )
    const box = screen.getByRole('textbox', { name: 'Note (optional)' })
    expect(box.getAttribute('aria-describedby')).toBe('note-help note-error')
    expect(box.getAttribute('aria-invalid')).toBe('true')
    expect(box.nextElementSibling?.id).toBe('note-help')
  })

  it('lets the settings row look be resized', () => {
    render(<Textarea label="Payment instructions" look="row" rows={3} />)
    const box = screen.getByRole('textbox', { name: 'Payment instructions' })
    expect(box.className).toContain('resize-y')
    expect(box.getAttribute('rows')).toBe('3')
  })

  it('shows the whole box when it takes focus, not only the caret’s line', () => {
    // jsdom has no scrollIntoView: a stand-in that records the call.
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: scrollIntoView,
      configurable: true,
    })
    const onFocus = vi.fn()
    render(<Textarea label="Payment instructions" look="row" onFocus={onFocus} />)
    const box = screen.getByRole('textbox', { name: 'Payment instructions' })
    fireEvent.focus(box)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
    expect(scrollIntoView.mock.contexts).toEqual([box])
    expect(onFocus).toHaveBeenCalledTimes(1)
  })
})
