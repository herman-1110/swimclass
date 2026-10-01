import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { HoursRange } from '../model/types'
import { EditDayHoursDialog } from './EditDayHoursDialog'

afterEach(cleanup)

const SATURDAY: HoursRange[] = [
  { opens_at: '07:00', closes_at: '12:00' },
  { opens_at: '16:00', closes_at: '22:00' },
]

function renderDialog(ranges: HoursRange[] = SATURDAY, weekday: 1 | 6 = 6) {
  const onApply = vi.fn()
  const onClose = vi.fn()
  render(
    <EditDayHoursDialog weekday={weekday} ranges={ranges} onApply={onApply} onClose={onClose} />,
  )
  return { onApply, onClose }
}

function range(position: number) {
  return screen.getByRole('group', { name: `Hours ${position}` })
}

function choose(position: number, part: 'From' | 'To', value: string) {
  fireEvent.change(within(range(position)).getByRole('combobox', { name: part }), {
    target: { value },
  })
}

describe('EditDayHoursDialog', () => {
  it('shows the day’s ranges, each with From, To and Remove', () => {
    renderDialog()
    screen.getByRole('dialog', {
      name: 'Saturday hours',
      description: 'Repeats every Saturday. Lessons already booked stay booked.',
    })
    const first = within(range(1))
    expect(first.getByRole<HTMLSelectElement>('combobox', { name: 'From' }).value).toBe('07:00')
    expect(first.getByRole<HTMLSelectElement>('combobox', { name: 'To' }).value).toBe('12:00')
    first.getByRole('button', { name: 'Remove 7:00 am to 12:00 pm' })
    within(range(2)).getByRole('button', { name: 'Remove 4:00 pm to 10:00 pm' })
    screen.getByRole('button', { name: 'Set Saturday hours' })
    screen.getByRole('button', { name: 'Cancel' })
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('offers 5:00 am to 11:00 pm every 15 minutes', () => {
    renderDialog()
    const options = within(within(range(1)).getByRole('combobox', { name: 'From' })).getAllByRole(
      'option',
    )
    expect(options).toHaveLength(73)
    expect(options[0].textContent).toBe('5:00 am')
    expect(options.at(-1)?.textContent).toBe('11:00 pm')
  })

  it('sets the day’s hours in opening order (Saturday from 8:00 am)', () => {
    const { onApply } = renderDialog()
    choose(1, 'From', '08:00')
    fireEvent.click(screen.getByRole('button', { name: 'Set Saturday hours' }))
    expect(onApply).toHaveBeenCalledWith([
      { opens_at: '08:00', closes_at: '12:00' },
      { opens_at: '16:00', closes_at: '22:00' },
    ])
  })

  it('says a day without hours is closed, and adds a range on "Choose" with focus on it', () => {
    const { onApply } = renderDialog([])
    screen.getByText('Closed all day.')
    fireEvent.click(screen.getByRole('button', { name: 'Add hours' }))
    const from = within(range(1)).getByRole<HTMLSelectElement>('combobox', { name: 'From' })
    expect(from.value).toBe('')
    expect(from.selectedOptions[0]?.textContent).toBe('Choose')
    expect(document.activeElement).toBe(from)
    expect(screen.queryByText('Closed all day.')).toBeNull()
    within(range(1)).getByRole('button', { name: 'Remove hours 1' })

    choose(1, 'From', '09:00')
    choose(1, 'To', '11:30')
    fireEvent.click(screen.getByRole('button', { name: 'Set Saturday hours' }))
    expect(onApply).toHaveBeenCalledWith([{ opens_at: '09:00', closes_at: '11:30' }])
  })

  it('removes a range, and closes the day when none is left', () => {
    const { onApply } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Remove 7:00 am to 12:00 pm' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add hours' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove 4:00 pm to 10:00 pm' }))
    screen.getByText('Closed all day.')
    fireEvent.click(screen.getByRole('button', { name: 'Set Saturday hours' }))
    expect(onApply).toHaveBeenCalledWith([])
  })

  it('refuses overlapping ranges under the second one and stays open (walkthrough 5)', () => {
    const { onApply } = renderDialog([{ opens_at: '17:30', closes_at: '22:00' }], 1)
    choose(1, 'To', '20:00')
    fireEvent.click(screen.getByRole('button', { name: 'Add hours' }))
    choose(2, 'From', '19:00')
    choose(2, 'To', '22:00')
    fireEvent.click(screen.getByRole('button', { name: 'Set Monday hours' }))

    expect(onApply).not.toHaveBeenCalled()
    const words = 'Two ranges on Monday overlap. Change one and save again.'
    expect(within(range(2)).getByText(words)).toBeTruthy()
    expect(within(range(1)).queryByText(words)).toBeNull()
    // The range's group is described by the message as well as its selects.
    screen.getByRole('group', { name: 'Hours 2', description: words })
    const from = within(range(2)).getByRole('combobox', { name: 'From', description: words })
    expect(from.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(from)
  })

  it('checks each range in order: "Choose", then the end, then 5:00 am–11:00 pm', () => {
    renderDialog([
      { opens_at: '17:30', closes_at: '24:00' },
      { opens_at: '12:00', closes_at: '09:00' },
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Add hours' }))
    choose(3, 'From', '13:00')
    fireEvent.click(screen.getByRole('button', { name: 'Set Saturday hours' }))

    within(range(1)).getByText('Open hours must be between 5:00 am and 11:00 pm.')
    within(range(2)).getByText(
      'The end time must be after the start time. Change it and try again.',
    )
    within(range(3)).getByText('Choose a start and an end time.')
    // Only the select at fault is marked: midnight is the problem in the first range.
    const first = within(range(1))
    expect(first.getByRole('combobox', { name: 'From' }).getAttribute('aria-invalid')).toBeNull()
    expect(first.getByRole('combobox', { name: 'To' }).getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(first.getByRole('combobox', { name: 'To' }))
  })

  it('shows a saved time off the list as it is ("12:00 am" for midnight)', () => {
    renderDialog([{ opens_at: '17:30', closes_at: '24:00' }])
    const to = within(range(1)).getByRole<HTMLSelectElement>('combobox', { name: 'To' })
    expect(to.value).toBe('24:00')
    expect(to.selectedOptions[0]?.textContent).toBe('12:00 am')
  })

  it('clears a range’s message once it changes', () => {
    renderDialog([{ opens_at: '12:00', closes_at: '09:00' }])
    fireEvent.click(screen.getByRole('button', { name: 'Set Saturday hours' }))
    const words = 'The end time must be after the start time. Change it and try again.'
    within(range(1)).getByText(words)
    choose(1, 'To', '13:00')
    expect(screen.queryByText(words)).toBeNull()
    expect(range(1).getAttribute('aria-describedby')).toBeNull()
  })

  it('drops its changes on Cancel and on Esc', () => {
    const { onApply, onClose } = renderDialog()
    choose(1, 'From', '08:00')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
    expect(onApply).not.toHaveBeenCalled()
  })
})
