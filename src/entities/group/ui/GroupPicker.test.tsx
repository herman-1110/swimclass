import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Group } from '../model/types'
import { GroupPicker } from './GroupPicker'

afterEach(cleanup)

const MEILING = 'a0000000-0000-4000-8000-000000000002'

const aimanAndSofia: Group = {
  group_id: 'c0000000-0000-4000-8000-000000000001',
  account_id: MEILING,
  location: 'Palm Court',
  active: true,
  opening_used_lessons: 12,
  opening_paid_lessons: 12,
  created_at: '2026-09-29T16:05:07.107+00:00',
  size: 2,
  type_label: '1-to-2',
  display_names: 'Aiman & Sofia',
  student_ids: ['b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002'],
}
const sofia: Group = {
  ...aimanAndSofia,
  group_id: 'c0000000-0000-4000-8000-000000000002',
  opening_used_lessons: 7,
  opening_paid_lessons: 4,
  size: 1,
  type_label: '1-to-1',
  display_names: 'Sofia',
  student_ids: ['b0000000-0000-4000-8000-000000000002'],
}

const radio = (name: string) => screen.getByRole<HTMLInputElement>('radio', { name })

/** Book's use: the picker as it is, holding the choice like the page does. */
function BookPicker({ onChange }: { onChange?: (groupId: string) => void }) {
  const [value, setValue] = useState<string | null>(aimanAndSofia.group_id)
  return (
    <GroupPicker
      groups={[aimanAndSofia, sofia]}
      value={value}
      onChange={(groupId) => {
        setValue(groupId)
        onChange?.(groupId)
      }}
    />
  )
}

/** Add booking's use: the page filters the groups by its search and says why none show. */
function AddBookingPicker({ groups, query }: { groups: readonly Group[]; query: string }) {
  return (
    <GroupPicker
      groups={groups}
      value={null}
      onChange={() => {}}
      legend="Group"
      help={null}
      layout="scroll"
      emptyText={`No active group matches “${query}”.`}
    />
  )
}

describe('GroupPicker', () => {
  it('is Book’s radio group: legend, one row per group with its tag, and the help', () => {
    render(<BookPicker />)
    const group = screen.getByRole('group', { name: 'Who’s this lesson for?' })
    const help = screen.getByText(
      'Your coach sets up who books together. Ask them if you need a new group.',
    )
    expect(group.getAttribute('aria-describedby')).toBe(help.id)
    expect(radio('Aiman & Sofia 1-to-2').checked).toBe(true)
    expect(radio('Sofia 1-to-1').checked).toBe(false)
    expect(radio('Sofia 1-to-1').name).toBe('book-group')
    expect(radio('Sofia 1-to-1').value).toBe(sofia.group_id)
    // No empty text, so no status region.
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('reports the group chosen by a press anywhere on its row', () => {
    const onChange = vi.fn()
    render(<BookPicker onChange={onChange} />)
    fireEvent.click(screen.getByText('1-to-1'))
    expect(onChange).toHaveBeenCalledWith(sofia.group_id)
    expect(radio('Sofia 1-to-1').checked).toBe(true)
  })

  it('moves the choice with the arrow keys', () => {
    const onChange = vi.fn()
    render(<BookPicker onChange={onChange} />)
    fireEvent.keyDown(radio('Aiman & Sofia 1-to-2'), { key: 'ArrowDown' })
    expect(onChange).toHaveBeenCalledWith(sofia.group_id)
    expect(radio('Sofia 1-to-1').checked).toBe(true)
  })

  it('checks nothing when no group is chosen', () => {
    render(<GroupPicker groups={[aimanAndSofia, sofia]} value={null} onChange={() => {}} />)
    expect(screen.getAllByRole<HTMLInputElement>('radio').map((input) => input.checked)).toEqual([
      false,
      false,
    ])
  })

  it('takes Add booking’s legend, name and second line, without Book’s help', () => {
    render(
      <GroupPicker
        groups={[aimanAndSofia]}
        value={null}
        onChange={() => {}}
        legend="Group"
        hideLegend
        help={null}
        name="add-booking-group"
        layout="list"
        secondary={() => 'Mei Ling’s account · Palm Court'}
      />,
    )
    const group = screen.getByRole('group', { name: 'Group' })
    expect(group.getAttribute('aria-describedby')).toBeNull()
    expect(screen.queryByText(/Your coach sets up/)).toBeNull()
    const row = radio('Aiman & Sofia Mei Ling’s account · Palm Court 1-to-2')
    expect(row.name).toBe('add-booking-group')
  })

  it('scrolls a long list in its own box, keeping every row in the one radio group', () => {
    const many = Array.from({ length: 8 }, (_, index): Group => ({
      ...sofia,
      group_id: `c0000000-0000-4000-8000-0000000001${index}0`,
      display_names: `Student ${index + 1}`,
    }))
    render(
      <GroupPicker
        groups={many}
        value={null}
        onChange={() => {}}
        legend="Group"
        help={null}
        layout="scroll"
      />,
    )
    const group = screen.getByRole('group', { name: 'Group' })
    expect(within(group).getAllByRole('radio')).toHaveLength(8)
    const box = radio('Student 1 1-to-1').closest('label')?.parentElement
    expect(box?.className).toContain('overflow-y-auto')
    // A row the arrow keys scroll into view keeps its focus ring inside the box.
    expect(box?.className).toContain('scroll-py-8')
  })

  it('shows the empty text in place of the rows', () => {
    render(
      <GroupPicker
        groups={[]}
        value={null}
        onChange={() => {}}
        legend="Group"
        help={null}
        emptyText="No active group matches “zz”."
      />,
    )
    expect(screen.getByRole('status').textContent).toBe('No active group matches “zz”.')
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })

  it('keeps its status in the page, so a search that empties the list is read out', () => {
    const { rerender } = render(<AddBookingPicker groups={[aimanAndSofia, sofia]} query="" />)
    // While there are rows the region is there, empty.
    const status = screen.getByRole('status')
    expect(status.textContent).toBe('')
    expect(screen.getAllByRole('radio')).toHaveLength(2)

    // The same region gets the words, which screen readers announce as a change.
    rerender(<AddBookingPicker groups={[]} query="zz" />)
    expect(screen.getByRole('status')).toBe(status)
    expect(status.textContent).toBe('No active group matches “zz”.')
    expect(screen.queryAllByRole('radio')).toHaveLength(0)

    rerender(<AddBookingPicker groups={[]} query="zzz" />)
    expect(status.textContent).toBe('No active group matches “zzz”.')

    rerender(<AddBookingPicker groups={[sofia]} query="so" />)
    expect(screen.getByRole('status')).toBe(status)
    expect(status.textContent).toBe('')
    expect(screen.getAllByRole('radio')).toHaveLength(1)
  })
})
