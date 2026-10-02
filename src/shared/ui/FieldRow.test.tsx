import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Checkbox } from './Checkbox'
import { Field } from './Field'
import { FieldList } from './FieldList'
import { FieldRow } from './FieldRow'
import { Select } from './Select'

afterEach(cleanup)

describe('FieldRow', () => {
  it('labels its control and gives the help the id the control lists', () => {
    render(
      <FieldList>
        <FieldRow
          label="Travel gap"
          help="Blocked before and after every lesson"
          htmlFor="set-gap"
          control={
            <Field
              id="set-gap"
              size="row"
              width="number"
              align="end"
              unit="min"
              aria-describedby="set-gap-help"
              defaultValue="60"
            />
          }
        />
      </FieldList>,
    )
    const input = screen.getByRole('textbox', { name: 'Travel gap' })
    expect(input.getAttribute('aria-describedby')).toBe('set-gap-help set-gap-unit')
    expect(document.getElementById('set-gap-help')?.textContent).toBe(
      'Blocked before and after every lesson',
    )
    expect(screen.getByText('Travel gap').tagName).toBe('LABEL')
  })

  it('names a standalone checkbox through the row label', () => {
    render(
      <FieldRow
        label="Approve new accounts"
        help="New sign-ups wait for you before they can book"
        htmlFor="set-approve"
        control={<Checkbox id="set-approve" look="standalone" defaultChecked />}
      />,
    )
    const box = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Approve new accounts' })
    expect(box.checked).toBe(true)
  })

  it('makes a set of inputs a group named and described by the row', () => {
    render(
      <FieldRow
        label="Lesson lengths"
        help="What customers can choose"
        group
        controlLayout="options"
        control={
          <>
            <Checkbox look="inline" label="1 hour" defaultChecked />
            <Checkbox look="inline" label="2 hours" defaultChecked />
          </>
        }
      />,
    )
    const group = screen.getByRole('group', { name: 'Lesson lengths' })
    const helpId = group.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(helpId)?.textContent).toBe('What customers can choose')
    expect(screen.getByText('Lesson lengths').tagName).toBe('SPAN')
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    // With large text the options wrap on their own line instead of leaving the frame.
    expect(group.className).toContain('flex-wrap')
  })

  it('shows a note and an error under the row with ids the control can list', () => {
    render(
      <FieldRow
        label="Booking window"
        htmlFor="set-window"
        note="Customers who already booked further ahead keep their lessons."
        error="Booking window has a value that isn’t allowed. Check it and save again."
        control={
          <Field
            id="set-window"
            size="row"
            width="number"
            aria-describedby="set-window-note set-window-error"
            aria-invalid
          />
        }
      />,
    )
    const note = document.getElementById('set-window-note')
    const error = document.getElementById('set-window-error')
    expect(note?.textContent).toBe('Customers who already booked further ahead keep their lessons.')
    expect(error?.textContent).toBe(
      'Booking window has a value that isn’t allowed. Check it and save again.',
    )
    const input = screen.getByRole('textbox', { name: 'Booking window' })
    expect(input.getAttribute('aria-invalid')).toBe('true')
    // The messages sit under the label and control's line, which keeps its drawn
    // no-wrap from 768 px, so the control stays beside the label.
    const line = screen.getByText('Booking window').parentElement?.parentElement
    expect(line?.contains(input)).toBe(true)
    expect(line?.className).toContain('md:flex-nowrap')
    expect(line?.contains(note ?? null)).toBe(false)
    expect(line?.contains(error ?? null)).toBe(false)
  })

  it('shows a two-line help in the one described element', () => {
    render(
      <FieldRow
        label="Unused lessons expire"
        htmlFor="set-expiry"
        help={
          <>
            Counted from when a package is paid
            <br />
            Not available yet
          </>
        }
        control={
          <Select
            id="set-expiry"
            size="row"
            options={[{ value: '0', label: 'Never' }]}
            aria-describedby="set-expiry-help"
            disabled
          />
        }
      />,
    )
    const select = screen.getByRole('combobox', { name: 'Unused lessons expire' })
    const help = document.getElementById('set-expiry-help')
    expect(select.getAttribute('aria-describedby')).toBe('set-expiry-help')
    expect(help?.firstChild?.textContent).toBe('Counted from when a package is paid')
    expect(help?.querySelectorAll('br')).toHaveLength(1)
    expect(help?.lastChild?.textContent).toBe('Not available yet')
  })

  it('describes a group by a help that is not plain text', () => {
    render(
      <FieldRow
        label="Lesson lengths"
        help={<>What customers can choose</>}
        group
        controlLayout="options"
        control={<Checkbox look="inline" label="1 hour" />}
      />,
    )
    const group = screen.getByRole('group', { name: 'Lesson lengths' })
    expect(document.getElementById(group.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'What customers can choose',
    )
  })
})
