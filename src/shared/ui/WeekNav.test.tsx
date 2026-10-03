import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WeekNav } from './WeekNav'

afterEach(cleanup)

describe('WeekNav', () => {
  it('has previous and next week buttons around the week, which is read out when it changes', () => {
    const onPrevious = vi.fn()
    const onNext = vi.fn()
    render(<WeekNav label="28 Sep – 4 Oct" onPrevious={onPrevious} onNext={onNext} stretch />)
    expect(screen.getByRole('group', { name: 'Week' })).toBeTruthy()
    expect(screen.getByText('28 Sep – 4 Oct').getAttribute('aria-live')).toBe('polite')
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull()
  })

  it('keeps a disabled arrow focusable but lets it do nothing (the end of the booking window)', () => {
    const onNext = vi.fn()
    render(<WeekNav label="19–25 Oct" onPrevious={() => {}} onNext={onNext} nextDisabled />)
    const next = screen.getByRole('button', { name: 'Next week' })
    next.focus()
    fireEvent.click(next)
    expect(onNext).not.toHaveBeenCalled()
    expect(next.getAttribute('aria-disabled')).toBe('true')
    expect(next.hasAttribute('disabled')).toBe(false)
    expect(document.activeElement).toBe(next)
    expect(
      screen.getByRole('button', { name: 'Previous week' }).hasAttribute('aria-disabled'),
    ).toBe(false)
  })

  it('shows Today for the coach', () => {
    const onToday = vi.fn()
    render(
      <WeekNav
        label="28 Sep – 4 Oct 2026"
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={onToday}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(onToday).toHaveBeenCalledTimes(1)
  })
})
