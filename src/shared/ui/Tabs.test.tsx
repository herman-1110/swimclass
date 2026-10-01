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

  it('keeps every tab in the Tab order, as drawn', () => {
    render(<Filters />)
    for (const item of filters) {
      const button = tab(`${item.label} ${item.count}`)
      expect(button.tabIndex).toBe(0)
      expect(button.hasAttribute('tabindex')).toBe(false)
    }
  })

  it('moves and chooses with the arrow keys, wrapping round, and Home and End', () => {
    render(<Filters />)
    tab('All 13').focus()
    fireEvent.keyDown(tab('All 13'), { key: 'ArrowRight' })
    expect(tab('Unpaid 2').getAttribute('aria-pressed')).toBe('true')
    expect(document.activeElement).toBe(tab('Unpaid 2'))

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

  it('moves from the focused tab, which Tab may have reached without choosing it', () => {
    render(<Filters />)
    tab('Paid 11').focus()
    fireEvent.keyDown(tab('Paid 11'), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(tab('Last lesson 2'))
    expect(tab('Last lesson 2').getAttribute('aria-pressed')).toBe('true')
    expect(tab('All 13').getAttribute('aria-pressed')).toBe('false')
  })

  it('leaves other keys alone', () => {
    const onChange = vi.fn()
    render(<Filters onChange={onChange} />)
    fireEvent.keyDown(tab('All 13'), { key: 'ArrowDown' })
    fireEvent.keyDown(tab('All 13'), { key: 'a' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps the chosen tab in view when the counts come in and widen the tabs', () => {
    // jsdom has no layout: each tab is 10 px per character, side by side, in a 250 px row.
    const width = (el: Element) => (el.textContent?.length ?? 0) * 10
    const scrolled = new WeakMap<Element, number>()
    const stub = (name: string, get: (el: HTMLElement) => number, set?: boolean) => {
      const saved = Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)
      Object.defineProperty(HTMLElement.prototype, name, {
        configurable: true,
        get(this: HTMLElement) {
          return get(this)
        },
        set: set
          ? function (this: HTMLElement, value: number) {
              scrolled.set(this, value)
            }
          : undefined,
      })
      return () => {
        if (saved) Object.defineProperty(HTMLElement.prototype, name, saved)
      }
    }
    const restore = [
      stub('offsetWidth', (el) => (el.tagName === 'BUTTON' ? width(el) : 0)),
      stub('offsetLeft', (el) => {
        let left = 0
        for (let before = el.previousElementSibling; before; before = before.previousElementSibling)
          left += width(before)
        return el.tagName === 'BUTTON' ? left : 0
      }),
      stub('clientWidth', (el) => (el.getAttribute('role') === 'group' ? 250 : 0)),
      stub('scrollLeft', (el) => scrolled.get(el) ?? 0, true),
    ]
    try {
      const items = (counts: boolean): TabsItem[] => [
        { value: 'all', label: 'All', count: counts ? 13 : undefined },
        { value: 'unpaid', label: 'Unpaid', count: counts ? 2 : undefined },
        { value: 'waiting', label: 'Waiting for approval', count: counts ? 1 : undefined },
      ]
      const view = (counts: boolean) => (
        <Tabs label="Filter packages" items={items(counts)} value="waiting" onChange={() => {}} />
      )
      const { rerender } = render(view(false))
      const row = screen.getByRole('group', { name: 'Filter packages' })
      // "Waiting for approval" ends at 290 px: scrolled 40 px.
      expect(row.scrollLeft).toBe(40)
      rerender(view(true))
      // "Waiting for approval 1" now ends at 360 px: scrolled 110 px, so all of it shows.
      expect(row.scrollLeft).toBe(110)
    } finally {
      for (const undo of restore) undo()
    }
  })
})
