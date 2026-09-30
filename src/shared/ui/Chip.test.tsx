import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Chip } from './Chip'

afterEach(cleanup)

describe('Chip', () => {
  it('is a button named for screen readers, pressed only when picked', () => {
    render(
      <>
        <Chip label="7:30 pm" state="free" selected={false} accessibleLabel="7:30 pm, available" />
        <Chip label="8:00 pm" state="free" selected accessibleLabel="8:00 pm, available" />
      </>,
    )
    const free = screen.getByRole('button', { name: '7:30 pm, available' })
    expect(free.textContent).toBe('7:30 pm')
    expect(free.getAttribute('type')).toBe('button')
    expect(free.getAttribute('aria-pressed')).toBe('false')
    expect(
      screen.getByRole('button', { name: '8:00 pm, available' }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('crosses out a clashing time but keeps it pressable, so pressing it can say why', () => {
    const pick = vi.fn()
    render(
      <Chip
        label="7:00 pm"
        state="clash"
        selected={false}
        accessibleLabel="7:00 pm, not available"
        onClick={pick}
      />,
    )
    const chip = screen.getByRole('button', { name: '7:00 pm, not available' })
    expect(chip.className).toContain('line-through')
    expect(chip.hasAttribute('disabled')).toBe(false)
    fireEvent.click(chip)
    expect(pick).toHaveBeenCalledTimes(1)
  })

  it('shows a picked clashing time in the attention colour', () => {
    render(<Chip label="7:00 pm" state="clash" selected accessibleLabel="7:00 pm, not available" />)
    const chip = screen.getByRole('button', { name: '7:00 pm, not available' })
    expect(chip.getAttribute('aria-pressed')).toBe('true')
    expect(chip.className).toContain('bg-warn-tint')
  })
})
