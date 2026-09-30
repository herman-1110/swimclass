import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Pill } from './Pill'

afterEach(cleanup)

describe('Pill', () => {
  it('shows the status in its tone', () => {
    render(<Pill tone="warn">Unpaid</Pill>)
    expect(screen.getByText('Unpaid').className).toContain('bg-warn-tint')
  })

  it('puts a note under the pill, muted unless it needs attention', () => {
    render(
      <>
        <Pill tone="warn" note="Starts today">
          Unpaid
        </Pill>
        <Pill tone="accent" note="Last lesson 1 Oct" noteTone="warn">
          Paid
        </Pill>
      </>,
    )
    const starts = screen.getByText('Starts today')
    expect(starts.className).toContain('text-muted')
    expect(starts.previousElementSibling?.textContent).toBe('Unpaid')
    expect(screen.getByText('Last lesson 1 Oct').className).toContain('text-warn')
    expect(screen.getByText('Paid').className).toContain('bg-accent-tint')
  })
})
