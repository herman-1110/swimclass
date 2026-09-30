import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { EmailLogRow } from '../model/types'
import { EmailLogList } from './EmailLogList'

afterEach(cleanup)

const ROWS: EmailLogRow[] = [
  {
    created_at: '2026-09-26T12:05:00+00:00',
    to_email: 'meiling@example.com',
    kind: 'booked',
    sent_at: '2026-09-26T12:06:00+00:00',
    attempts: 1,
    last_error: null,
  },
  {
    created_at: '2026-09-26T12:00:00+00:00',
    to_email: 'coach@example.com',
    kind: 'late_alert',
    sent_at: null,
    attempts: 0,
    last_error: null,
  },
  {
    created_at: '2026-09-25T11:00:00+00:00',
    to_email: 'farah@example.com',
    kind: 'broadcast',
    sent_at: null,
    attempts: 3,
    last_error: 'Mailbox full',
  },
]

describe('EmailLogList', () => {
  it('shows every email in a table from 768 px, newest first', () => {
    render(
      <>
        <h2 id="log-title">Email log</h2>
        <EmailLogList rows={ROWS} labelledBy="log-title" />
      </>,
    )
    const table = screen.getByRole('table', { name: 'Email log' })
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent)
    expect(headers).toEqual(['When', 'To', 'Kind', 'Status'])
    const rows = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent),
      )
    expect(rows).toEqual([
      ['Sat 26 Sep, 8:05 pm', 'meiling@example.com', 'Booking confirmation', 'Sent 8:06 pm'],
      ['Sat 26 Sep, 8:00 pm', 'coach@example.com', 'Late-change alert', 'Waiting'],
      [
        'Fri 25 Sep, 7:00 pm',
        'farah@example.com',
        'Message to customers',
        'Not sent: Mailbox full',
      ],
    ])
    expect(within(table).getByText('Not sent: Mailbox full').className).toContain('text-warn')
  })

  it('lists the same emails for phones', () => {
    render(
      <>
        <h2 id="log-title">Email log</h2>
        <EmailLogList rows={ROWS} labelledBy="log-title" />
      </>,
    )
    const list = screen.getByRole('list', { name: 'Email log' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'Booking confirmationmeiling@example.comSat 26 Sep, 8:05 pm · Sent 8:06 pm',
      'Late-change alertcoach@example.comSat 26 Sep, 8:00 pm · Waiting',
      'Message to customersfarah@example.comFri 25 Sep, 7:00 pm · Not sent: Mailbox full',
    ])
  })

  it('names the table itself when no heading is given', () => {
    render(<EmailLogList rows={ROWS} />)
    expect(screen.getByRole('table', { name: 'Email log' })).toBeTruthy()
  })

  it('says so when no email has been queued yet', () => {
    render(<EmailLogList rows={[]} />)
    expect(screen.getByText('No emails yet.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
