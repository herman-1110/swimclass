import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Slot } from '../model/types'
import { TimeChipGrid } from './TimeChipGrid'
import { TimeChipGridSkeleton } from './TimeChipGridSkeleton'

afterEach(cleanup)

// Tue 29 Sep for Aiman & Sofia, 1 hour (book.md §8.2), as week_slots sends it.
const free = (utc: string): Slot => ({
  day: '2026-09-29',
  starts_at: utc,
  ok: true,
  reason: null,
  detail: null,
})
const tuesday: Slot[] = [
  {
    day: '2026-09-29',
    starts_at: '2026-09-29T09:30:00+00:00',
    ok: false,
    reason: 'overlap_other',
    detail: { starts_at: '2026-09-29T17:30:00+08:00', ends_at: '2026-09-29T18:30:00+08:00' },
  },
  {
    day: '2026-09-29',
    starts_at: '2026-09-29T11:00:00+00:00',
    ok: false,
    reason: 'gap_after',
    detail: { ends_at: '2026-09-29T18:30:00+08:00' },
  },
  free('2026-09-29T11:30:00+00:00'),
  free('2026-09-29T12:00:00+00:00'),
]
// Sat 3 Oct 7:00 am is 2 Oct in UTC.
const saturdayMorning: Slot = {
  day: '2026-10-03',
  starts_at: '2026-10-02T23:00:00+00:00',
  ok: true,
  reason: null,
  detail: null,
}

const chip = (name: string) => screen.getByRole('button', { name })

describe('TimeChipGrid', () => {
  it('shows each start as a chip that says whether it is available', () => {
    render(<TimeChipGrid slots={tuesday} selected={null} onSelect={() => {}} />)
    const evening = screen.getByRole('group', { name: 'Evening' })
    expect(
      within(evening)
        .getAllByRole('button')
        .map((button) => [button.textContent, button.getAttribute('aria-label')]),
    ).toEqual([
      ['5:30 pm', '5:30 pm, not available'],
      ['7:00 pm', '7:00 pm, not available'],
      ['7:30 pm', '7:30 pm, available'],
      ['8:00 pm', '8:00 pm, available'],
    ])
    // Tuesday has no morning starts, so no Morning group.
    expect(screen.queryByRole('group', { name: 'Morning' })).toBeNull()
  })

  it('splits the day at noon MYT into Morning and Evening', () => {
    render(
      <TimeChipGrid slots={[saturdayMorning, ...tuesday]} selected={null} onSelect={() => {}} />,
    )
    const morning = screen.getByRole('group', { name: 'Morning' })
    expect(
      within(morning)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['7:00 am'])
    expect(
      within(screen.getByRole('group', { name: 'Evening' })).getAllByRole('button'),
    ).toHaveLength(4)
  })

  it('marks the picked start, matching the moment however it is written', () => {
    render(<TimeChipGrid slots={tuesday} selected="2026-09-29T11:30:00.000Z" onSelect={() => {}} />)
    expect(chip('7:30 pm, available').getAttribute('aria-pressed')).toBe('true')
    expect(chip('8:00 pm, available').getAttribute('aria-pressed')).toBe('false')
    expect(chip('7:30 pm, available').className).toContain('bg-accent')
  })

  it('lets a crossed-out start be picked, to show why it isn’t available', () => {
    const onSelect = vi.fn()
    const { rerender } = render(
      <TimeChipGrid slots={tuesday} selected={null} onSelect={onSelect} />,
    )
    const crossedOut = chip('7:00 pm, not available')
    expect(crossedOut.hasAttribute('disabled')).toBe(false)
    expect(crossedOut.className).toContain('line-through')
    fireEvent.click(crossedOut)
    expect(onSelect).toHaveBeenCalledWith(tuesday[1])

    rerender(<TimeChipGrid slots={tuesday} selected={tuesday[1].starts_at} onSelect={onSelect} />)
    expect(chip('7:00 pm, not available').getAttribute('aria-pressed')).toBe('true')
    expect(chip('7:00 pm, not available').className).toContain('bg-warn-tint')
  })

  it('renders nothing for a day with no starts', () => {
    const { container } = render(<TimeChipGrid slots={[]} selected={null} onSelect={() => {}} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('TimeChipGridSkeleton', () => {
  it('draws hidden placeholder chips', () => {
    const { container } = render(<TimeChipGridSkeleton count={4} />)
    const blocks = container.querySelectorAll('[aria-hidden="true"]')
    expect(blocks).toHaveLength(4)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
