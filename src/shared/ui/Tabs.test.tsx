import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Tabs, type TabsItem } from './Tabs'

afterEach(cleanup)

const filters: TabsItem[] = [
  { value: 'all', label: 'All', count: 13 },
  { value: 'unpaid', label: 'Unpaid', count: 2 },
  { value: 'last', label: 'Last lesson', count: 2 },
  { value: 'paid', label: 'Paid', count: 11 },
]

function Filters({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('all')
  return (
    <Tabs
      label="Filter packages"
      items={filters}
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
      note="One row per package · needs action first"
    />
  )
}

function tab(name: string) {
  return screen.getByRole('button', { name })
}

describe('Tabs', () => {
  it('is a named group of buttons with their counts, the chosen one pressed', () => {
    render(<Filters />)
    const group = screen.getByRole('group', { name: 'Filter packages' })
    expect(
      within(group)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['All 13', 'Unpaid 2', 'Last lesson 2', 'Paid 11'])
    expect(tab('All 13').getAttribute('aria-pressed')).toBe('true')
    expect(tab('Paid 11').getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('One row per package · needs action first')).toBeTruthy()
  })

  it('chooses a tab when it is clicked', () => {
    const onChange = vi.fn()
    render(<Filters onChange={onChange} />)
    fireEvent.click(tab('Unpaid 2'))
    expect(onChange).toHaveBeenCalledWith('unpaid')
    expect(tab('Unpaid 2').getAttribute('aria-pressed')).toBe('true')
    expect(tab('All 13').getAttribute('aria-pressed')).toBe('false')
  })

  it('is one Tab stop: only the chosen tab is in the Tab order', () => {
    render(<Filters />)
    expect(filters.map((item) => tab(`${item.label} ${item.count}`).tabIndex)).toEqual([
      0, -1, -1, -1,
    ])
  })

  it('moves and chooses with the arrow keys, wrapping round, and Home and End', () => {
    render(<Filters />)
    tab('All 13').focus()
    fireEvent.keyDown(tab('All 13'), { key: 'ArrowRight' })
    expect(tab('Unpaid 2').getAttribute('aria-pressed')).toBe('true')
    expect(document.activeElement).toBe(tab('Unpaid 2'))
    expect(tab('Unpaid 2').tabIndex).toBe(0)

    fireEvent.keyDown(tab('Unpaid 2'), { key: 'ArrowLeft' })
    fireEvent.keyDown(tab('All 13'), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(tab('Paid 11'))
    expect(tab('Paid 11').getAttribute('aria-pressed')).toBe('true')

    fireEvent.keyDown(tab('Paid 11'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tab('All 13'))

    fireEvent.keyDown(tab('All 13'), { key: 'End' })
    expect(document.activeElement).toBe(tab('Paid 11'))
    fireEvent.keyDown(tab('Paid 11'), { key: 'Home' })
    expect(document.activeElement).toBe(tab('All 13'))
    expect(tab('All 13').getAttribute('aria-pressed')).toBe('true')
  })

  it('leaves other keys alone', () => {
    const onChange = vi.fn()
    render(<Filters onChange={onChange} />)
    fireEvent.keyDown(tab('All 13'), { key: 'ArrowDown' })
    fireEvent.keyDown(tab('All 13'), { key: 'a' })
    expect(onChange).not.toHaveBeenCalled()
  })
})
