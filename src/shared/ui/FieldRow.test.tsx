import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Checkbox } from './Checkbox'
import { Field } from './Field'
import { FieldList } from './FieldList'
import { FieldRow } from './FieldRow'

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
    expect(document.getElementById('set-window-note')?.textContent).toBe(
      'Customers who already booked further ahead keep their lessons.',
    )
    expect(document.getElementById('set-window-error')?.textContent).toBe(
      'Booking window has a value that isn’t allowed. Check it and save again.',
    )
    const input = screen.getByRole('textbox', { name: 'Booking window' })
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })
})
