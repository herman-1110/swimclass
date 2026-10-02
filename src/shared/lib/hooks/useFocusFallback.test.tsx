import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useFocusFallback } from './useFocusFallback'

afterEach(cleanup)

function List({ rows }: { rows: string[] }) {
  const fallback = useFocusFallback(() => document.getElementById('heading'))
  return (
    <section {...fallback}>
      <h2 id="heading" tabIndex={-1}>
        Upcoming
      </h2>
      {rows.map((row) => (
        <button key={row} type="button">
          {row}
        </button>
      ))}
    </section>
  )
}

describe('useFocusFallback', () => {
  it('focuses the target when the focused control leaves with its row', () => {
    const { rerender } = render(<List rows={['Sat 3 Oct', 'Sun 4 Oct']} />)
    screen.getByRole('button', { name: 'Sat 3 Oct' }).focus()
    rerender(<List rows={['Sun 4 Oct']} />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Upcoming' }))
  })

  it('leaves focus alone when the control stays, or focus was moved away on purpose', () => {
    const { rerender } = render(
      <>
        <List rows={['Sat 3 Oct', 'Sun 4 Oct']} />
        <button type="button">Elsewhere</button>
      </>,
    )
    screen.getByRole('button', { name: 'Sat 3 Oct' }).focus()
    rerender(
      <>
        <List rows={['Sat 3 Oct']} />
        <button type="button">Elsewhere</button>
      </>,
    )
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sat 3 Oct' }))

    // Focus moved out of the block, then the block's row left: nothing to put back.
    screen.getByRole('button', { name: 'Elsewhere' }).focus()
    rerender(
      <>
        <List rows={[]} />
        <button type="button">Elsewhere</button>
      </>,
    )
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Elsewhere' }))

    // The other control leaving later doesn't pull focus back into the block either.
    rerender(<List rows={[]} />)
    expect(document.activeElement).toBe(document.body)
  })
})
