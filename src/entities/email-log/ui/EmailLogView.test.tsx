import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppError } from '@/shared/api/rpc'

import type { EmailLogRow } from '../model/types'
import { type EmailLogQueryState, EmailLogView } from './EmailLogView'

afterEach(cleanup)

const ROW: EmailLogRow = {
  created_at: '2026-09-26T12:05:00+00:00',
  to_email: 'meiling@example.com',
  kind: 'cancelled',
  sent_at: null,
  attempts: 0,
  last_error: null,
}

function query(state: Partial<EmailLogQueryState>): EmailLogQueryState {
  return {
    data: undefined,
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    errorUpdatedAt: 0,
    refetch: vi.fn(() => Promise.resolve()),
    ...state,
  }
}

describe('EmailLogView', () => {
  it('is a section named "Email log" with its note, for the #email-log link', () => {
    const { container } = render(<EmailLogView limit={50} query={query({ data: [ROW] })} />)
    const section = screen.getByRole('region', { name: 'Email log' })
    expect(section.id).toBe('email-log')
    expect(within(section).getByText('The last 50 emails, newest first.')).toBeTruthy()
    expect(within(section).getAllByText('Cancellation')).toHaveLength(2)
    expect(container.querySelector('[aria-busy]')).toBeNull()
  })

  it('shows a skeleton and says it is loading', () => {
    render(<EmailLogView limit={50} query={query({ isPending: true })} />)
    expect(screen.getByRole('status').textContent).toBe('Loading the email log…')
    expect(screen.getByRole('region').getAttribute('aria-busy')).toBe('true')
  })

  it('says what went wrong and tries again', () => {
    const refetch = vi.fn(() => Promise.resolve())
    render(
      <EmailLogView
        limit={50}
        query={query({ isError: true, error: new AppError('network'), refetch })}
      />,
    )
    expect(screen.getByRole('alert').textContent).toContain(
      'Couldn’t reach the server. Check your connection and try again.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('keeps “Try again” focused and busy while it reads, then focuses the title', () => {
    const failed = { error: new AppError('network'), errorUpdatedAt: 1000 }
    const { rerender } = render(
      <EmailLogView limit={50} query={query({ isError: true, ...failed })} />,
    )
    const retry = screen.getByRole('button', { name: 'Try again' })
    retry.focus()
    fireEvent.click(retry)
    rerender(
      <EmailLogView
        limit={50}
        query={query({ isPending: true, isFetching: true, errorUpdatedAt: 1000 })}
      />,
    )
    expect(document.activeElement).toBe(retry)
    expect(retry.getAttribute('aria-busy')).toBe('true')
    rerender(<EmailLogView limit={50} query={query({ data: [ROW], errorUpdatedAt: 1000 })} />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Email log' }))
  })

  it('counts a smaller log naturally', () => {
    render(<EmailLogView limit={1} query={query({ data: [] })} />)
    expect(screen.getByText('The last 1 email, newest first.')).toBeTruthy()
    expect(screen.getByText('No emails yet.')).toBeTruthy()
  })
})
