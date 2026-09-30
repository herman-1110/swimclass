import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Checkbox } from './Checkbox'

afterEach(cleanup)

describe('Checkbox', () => {
  it('is a native checkbox named by its label, and the whole row toggles it', () => {
    const onChange = vi.fn()
    render(<Checkbox size="md" label="Repeat weekly: also book Tue 6 Oct" onChange={onChange} />)
    const box = screen.getByRole<HTMLInputElement>('checkbox', {
      name: 'Repeat weekly: also book Tue 6 Oct',
    })
    expect(box.className).toContain('size-5')
    fireEvent.click(screen.getByText('Repeat weekly: also book Tue 6 Oct'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(box.checked).toBe(true)
  })

  it('links its help line', () => {
    render(
      <Checkbox
        id="add-paid"
        label="First package already paid"
        help="1-to-3 package · 4 lessons · RM 240"
      />,
    )
    const box = screen.getByRole('checkbox', { name: 'First package already paid' })
    expect(box.getAttribute('aria-describedby')).toBe('add-paid-help')
    expect(document.getElementById('add-paid-help')?.textContent).toBe(
      '1-to-3 package · 4 lessons · RM 240',
    )
  })

  it('is named by the settings row it sits in when it stands alone, in a 44 px target', () => {
    const onChange = vi.fn()
    render(
      <>
        <label htmlFor="set-approve">Approve new accounts</label>
        <Checkbox id="set-approve" look="standalone" defaultChecked onChange={onChange} />
      </>,
    )
    const box = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Approve new accounts' })
    expect(box.parentElement?.tagName).toBe('LABEL')
    expect(box.parentElement?.className).toContain('size-11')
    fireEvent.click(box.parentElement as HTMLElement)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(box.checked).toBe(false)
  })

  it('sits beside others as an inline option', () => {
    render(
      <div role="group" aria-label="Lesson lengths">
        <Checkbox look="inline" label="1 hour" defaultChecked />
        <Checkbox look="inline" label="2 hours" />
      </div>,
    )
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: '1 hour' }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: '2 hours' }).checked).toBe(false)
  })

  it('can be disabled', () => {
    // The browser then ignores presses (jsdom's synthetic clicks don't model that).
    render(<Checkbox label="Pin as a banner until I remove it" disabled />)
    const box = screen.getByRole('checkbox', { name: 'Pin as a banner until I remove it' })
    expect(box.hasAttribute('disabled')).toBe(true)
    expect(box.closest('label')?.className).toContain('has-disabled:text-muted')
  })
})
