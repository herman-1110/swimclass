import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ScheduleNotice } from './ScheduleNotice'
import { useNotice } from './useNotice'

// The notice after a change (the Schedule spec §3.9): a new one replaces the last, the next
// action clears it, and it goes after 8 s, but never from under focus.

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function Harness() {
  const notice = useNotice()
  return (
    <>
      <button type="button" onClick={() => notice.show('Sent to all customers.')}>
        Send
      </button>
      <button type="button" onClick={() => notice.show('Blocked time removed.', { focus: true })}>
        Remove
      </button>
      <button type="button" onClick={notice.clear}>
        Next week
      </button>
      <ScheduleNotice state={notice} />
      <button type="button">Elsewhere</button>
    </>
  )
}

function shown() {
  return screen.getByRole('status').textContent
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('useNotice', () => {
  it('goes after 8 s', () => {
    render(<Harness />)
    expect(shown()).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(shown()).toBe('Sent to all customers.')
    wait(7999)
    expect(shown()).toBe('Sent to all customers.')
    wait(1)
    expect(shown()).toBe('')
  })

  it('is replaced by the next notice, which gets its own 8 s', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    wait(5000)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(shown()).toBe('Blocked time removed.')
    act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus())
    wait(5000)
    expect(shown()).toBe('Blocked time removed.')
    wait(3000)
    expect(shown()).toBe('')
  })

  it('is cleared by the next action', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(shown()).toBe('')
  })

  it('takes focus when asked, stays while it has it, and goes once focus leaves', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    const box = screen.getByText('Blocked time removed.')
    expect(document.activeElement).toBe(box)
    wait(20_000)
    expect(shown()).toBe('Blocked time removed.')
    act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus())
    expect(shown()).toBe('')
  })

  it('leaves when focus leaves before its time is up only once the time is up', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus())
    expect(shown()).toBe('Blocked time removed.')
    wait(8000)
    expect(shown()).toBe('')
  })
})
