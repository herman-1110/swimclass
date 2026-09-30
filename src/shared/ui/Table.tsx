import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export type TableColumn = {
  key: string
  /** The header text ("Students"). */
  header: string
  /** Header text for screen readers only ("Actions"): an empty header cell reads badly. */
  hideHeader?: boolean
  /** Tailwind width classes for the column's content, as the drawings give it (the cell
   *  padding is added): "w-50", "w-10 md:w-18", "w-[1%]". */
  width?: string
  /** end: right-aligned (the Action column). */
  align?: 'start' | 'end'
  /** The row's name: its cells are <th scope="row">, styled like the others. */
  rowHeader?: boolean
  /** Keep the cell on one line. */
  nowrap?: boolean
  /** 6 px sides (10 px from 768 px) and no top or bottom padding: the open hours' Edit column. */
  tight?: boolean
}

export type TableRowData = {
  key: string
  /** The row the side panel shows: --accent-soft, which wins over the zebra stripe. */
  selected?: boolean
  /** One node per column key. */
  cells: Record<string, ReactNode>
}

type TableProps = {
  columns: readonly TableColumn[]
  rows: readonly TableRowData[]
  /** default: the Students table (11/14 px header, 10/14 px cells). compact: the open hours
   *  (10/12 px header, 48 px rows; 16 px sides from 768 px). */
  density?: 'default' | 'compact'
} & (
  | {
      /** Names the table for screen readers (a visually hidden caption). */
      caption: string
      labelledBy?: never
    }
  | {
      caption?: never
      /** Or the id of a visible heading that names it. */
      labelledBy: string
    }
)

const headPadding = {
  default: 'px-3.5 py-2.75',
  compact: 'px-3 py-2.5 md:px-4',
}
const cellPadding = {
  default: 'box-content px-3.5 py-2.5',
  // 48 px rows, the rule below included (drawn with box-sizing: border-box).
  compact: 'box-border h-12 px-3 py-1.5 md:px-4',
}
const tightPadding = 'px-1.5 py-0 md:px-2.5'
const tightCell = { default: 'box-content', compact: 'box-border h-12' }

/**
 * A data table in a light frame (DESIGN §3; design/AdminStudents.dc.html,
 * AdminSettings.dc.html): --frame border, radius 12, --table-head header with 12 px 600
 * --tag-ink text, --line-row dividers, zebra rows. Pages show it from 768 px and cards below
 * (DESIGN §5).
 */
export function Table({ columns, rows, density = 'default', caption, labelledBy }: TableProps) {
  return (
    <div className="overflow-hidden rounded-frame border border-frame">
      <table aria-labelledby={labelledBy} className="w-full border-collapse">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="bg-table-head">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  // Column widths leave out the padding, as in the drawings.
                  'box-content border-b border-frame text-small font-semibold text-tag-ink',
                  column.tight ? tightPadding : headPadding[density],
                  column.align === 'end' ? 'text-right' : 'text-left',
                  column.nowrap && 'whitespace-nowrap',
                  column.width,
                )}
              >
                {column.hideHeader ? (
                  <span className="sr-only">{column.header}</span>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const last = index === rows.length - 1
            return (
              <tr
                key={row.key}
                aria-current={row.selected ? 'true' : undefined}
                className={row.selected ? 'bg-accent-soft' : 'even:bg-zebra'}
              >
                {columns.map((column) => {
                  const Cell = column.rowHeader ? 'th' : 'td'
                  return (
                    <Cell
                      key={column.key}
                      scope={column.rowHeader ? 'row' : undefined}
                      className={cn(
                        'align-middle font-normal',
                        column.tight ? cn(tightPadding, tightCell[density]) : cellPadding[density],
                        !last && 'border-b border-line-row',
                        column.align === 'end' ? 'text-right' : 'text-left',
                        column.nowrap && 'whitespace-nowrap',
                        column.width,
                      )}
                    >
                      {row.cells[column.key]}
                    </Cell>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
