import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DayStrip, type DayStripDay } from './DayStrip'

afterEach(cleanup)

// Book's week of 28 Sep for Aiman & Sofia, 1 hour (the demo seed; ui-kit §6).
const book: DayStripDay[] = [
  ['2026-09-28', 'Mon', '28', 1],
  ['2026-09-29', 'Tue', '29', 4],
  ['2026-09-30', 'Wed', '30', 3],
  ['2026-10-01', 'Thu', '1', 0],
  ['2026-10-02', 'Fri', '2', 1],
  ['2026-10-03', 'Sat', '3', 6],
  ['2026-10-04', 'Sun', '4', 1],
].map(([key, weekday, date, free]) => ({
  key: String(key),
  weekday: String(weekday),
  date: String(date),
  label: `${weekday} ${date} ${Number(date) > 27 ? 'Sep' : 'Oct'}, ${
    free === 0 ? 'fully booked' : `${free} free start time${free === 1 ? '' : 's'}`
  }`,
  dot: Number(free) > 0,
  dimmed: free === 0,
}))

describe('DayStrip', () => {
  it('is a group named by its heading, with a button per day', () => {
    render(
      <DayStrip
        days={book}
        selected="2026-09-29"
        onSelect={() => {}}
        heading={{ label: 'Day', range: '28 Sep – 4 Oct' }}
      />,
    )
    const group = screen.getByRole('group', { name: 'Day' })
    expect(within(group).getAllByRole('button')).toHaveLength(7)
    expect(screen.getByText('28 Sep – 4 Oct')).toBeTruthy()
  })

  it('names each day by its label and presses only the picked one', () => {
    render(<DayStrip days={book} selected="2026-09-29" onSelect={() => {}} />)
    const tuesday = screen.getByRole('button', { name: 'Tue 29 Sep, 4 free start times' })
    expect(tuesday.getAttribute('aria-pressed')).toBe('true')
    expect(tuesday.textContent).toBe('Tue29')
    const thursday = screen.getByRole('button', { name: 'Thu 1 Oct, fully booked' })
    expect(thursday.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Mon 28 Sep, 1 free start time' })).toBeTruthy()
  })

  it('picks a day by its key', () => {
    const onSelect = vi.fn()
    render(<DayStrip days={book} selected="2026-09-29" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sat 3 Oct, 6 free start times' }))
    expect(onSelect).toHaveBeenCalledWith('2026-10-03')
  })

  it('does not pick a disabled (past) day', () => {
    const onSelect = vi.fn()
    const days = book.map((day, index) =>
      index === 0 ? { ...day, label: 'Mon 28 Sep, past', disabled: true } : day,
    )
    render(<DayStrip days={days} selected="2026-09-29" onSelect={onSelect} />)
    const past = screen.getByRole('button', { name: 'Mon 28 Sep, past' })
    expect(past.hasAttribute('disabled')).toBe(true)
    fireEvent.click(past)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('shows a caption under each date instead of the dot (coach), in a group named Days', () => {
    const coach = book.map((day, index) => ({
      ...day,
      label: `Day ${index + 1}, ${index} lessons`,
      caption: `${index} lessons`,
    }))
    render(<DayStrip days={coach} selected="2026-10-03" onSelect={() => {}} />)
    const group = screen.getByRole('group', { name: 'Days' })
    expect(within(group).getByText('5 lessons')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Day 6, 5 lessons' }).getAttribute('aria-pressed'),
    ).toBe('true')
  })
})
