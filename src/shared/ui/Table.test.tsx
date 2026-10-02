import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Table, type TableColumn } from './Table'

afterEach(cleanup)

const columns: TableColumn[] = [
  { key: 'students', header: 'Students', width: 'w-50', rowHeader: true },
  { key: 'type', header: 'Type', width: 'w-18' },
  { key: 'action', header: 'Action', align: 'end' },
]

describe('Table', () => {
  it('is a real table: caption, column headers and a row header per row', () => {
    render(
      <Table
        caption="Packages, needs action first"
        columns={columns}
        rows={[
          { key: 'a', selected: true, cells: { students: 'Hana', type: '1-to-1', action: 'x' } },
          { key: 'b', cells: { students: 'Wei Jie', type: '1-to-1', action: 'y' } },
        ]}
      />,
    )
    const table = screen.getByRole('table', { name: 'Packages, needs action first' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Students', 'Type', 'Action'])
    expect(within(table).getByRole('rowheader', { name: 'Wei Jie' })).toBeTruthy()
    const rows = within(table).getAllByRole('row')
    expect(rows[1].getAttribute('aria-current')).toBe('true')
    expect(rows[2].hasAttribute('aria-current')).toBe(false)
  })

  it('scrolls sideways inside its frame when it can’t fit, never hiding a column', () => {
    render(<Table caption="Open hours" columns={columns} rows={[]} />)
    const frame = screen.getByRole('table').parentElement
    expect(frame?.className).toContain('overflow-x-auto')
    // Holds the screen-reader-only text, which would otherwise widen the page.
    expect(frame?.className).toContain('relative')
  })

  it('can be named by a visible heading, with a header read only by screen readers', () => {
    render(
      <>
        <h2 id="open-hours-title">Open hours</h2>
        <Table
          labelledBy="open-hours-title"
          density="compact"
          columns={[
            { key: 'day', header: 'Day', rowHeader: true },
            { key: 'hours', header: 'Hours' },
            { key: 'edit', header: 'Actions', hideHeader: true, tight: true, align: 'end' },
          ]}
          rows={[{ key: '1', cells: { day: 'Mon', hours: '5:30–10:00 pm', edit: 'Edit' } }]}
        />
      </>,
    )
    const table = screen.getByRole('table', { name: 'Open hours' })
    expect(within(table).getByRole('columnheader', { name: 'Actions' })).toBeTruthy()
  })
})
