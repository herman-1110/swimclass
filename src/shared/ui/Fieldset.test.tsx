import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { Fieldset } from './Fieldset'

afterEach(cleanup)

/** Four native radios of one name (the third disabled) and one of another name. */
function Radios() {
  const [value, setValue] = useState('a')
  const [other, setOther] = useState('x')
  return (
    <Fieldset legend="Pick one">
      {['a', 'b', 'c', 'd'].map((option) => (
        <label key={option}>
          <input
            type="radio"
            name="pick"
            value={option}
            checked={value === option}
            disabled={option === 'c'}
            onChange={() => setValue(option)}
          />
          {option.toUpperCase()}
        </label>
      ))}
      <label>
        <input type="radio" name="other" checked={other === 'x'} onChange={() => setOther('x')} />X
      </label>
    </Fieldset>
  )
}

const radio = (name: string) => screen.getByRole<HTMLInputElement>('radio', { name })
const checked = () =>
  screen
    .getAllByRole('radio')
    .filter((r) => (r as HTMLInputElement).checked && r.getAttribute('name') === 'pick')

describe('Fieldset', () => {
  it('is a group named by its legend, and describes it with its help and error', () => {
    render(
      <Fieldset id="type" legend="Lesson type" help="Up to 3 students." error="Choose a type.">
        <input aria-label="Inside" />
      </Fieldset>,
    )
    const group = screen.getByRole('group', { name: 'Lesson type' })
    expect(group.getAttribute('aria-describedby')).toBe('type-help type-error')
    expect(document.getElementById('type-help')?.textContent).toBe('Up to 3 students.')
    expect(document.getElementById('type-error')?.textContent).toBe('Choose a type.')
  })

  it('keeps a hidden legend for screen readers', () => {
    render(
      <Fieldset legend="Lesson length" hideLegend>
        <span />
      </Fieldset>,
    )
    expect(screen.getByRole('group', { name: 'Lesson length' })).toBeTruthy()
    expect(screen.getByText('Lesson length').className).toBe('sr-only')
  })

  it('moves the choice with the arrow keys, wrapping and skipping disabled radios', () => {
    render(<Radios />)
    radio('A').focus()

    fireEvent.keyDown(radio('A'), { key: 'ArrowRight' })
    expect(radio('B').checked).toBe(true)
    expect(document.activeElement).toBe(radio('B'))

    // C is disabled, so ArrowDown goes on to D.
    fireEvent.keyDown(radio('B'), { key: 'ArrowDown' })
    expect(radio('D').checked).toBe(true)
    expect(document.activeElement).toBe(radio('D'))

    // Past the end it wraps to the start, and back again.
    fireEvent.keyDown(radio('D'), { key: 'ArrowRight' })
    expect(radio('A').checked).toBe(true)
    fireEvent.keyDown(radio('A'), { key: 'ArrowUp' })
    expect(radio('D').checked).toBe(true)
    fireEvent.keyDown(radio('D'), { key: 'ArrowLeft' })
    expect(radio('B').checked).toBe(true)

    expect(checked()).toHaveLength(1)
    // Radios of another name are another group.
    expect(radio('X').checked).toBe(true)
  })

  it('leaves other keys alone', () => {
    render(<Radios />)
    fireEvent.keyDown(radio('A'), { key: 'Enter' })
    fireEvent.keyDown(radio('A'), { key: 'Tab' })
    expect(radio('A').checked).toBe(true)
  })

  it('lets a handler of its own stop the move', () => {
    function Stopped() {
      const [value, setValue] = useState('a')
      return (
        <Fieldset legend="Pick one" onKeyDown={(event) => event.preventDefault()}>
          {['a', 'b'].map((option) => (
            <label key={option}>
              <input
                type="radio"
                name="pick"
                checked={value === option}
                onChange={() => setValue(option)}
              />
              {option.toUpperCase()}
            </label>
          ))}
        </Fieldset>
      )
    }
    render(<Stopped />)
    fireEvent.keyDown(radio('A'), { key: 'ArrowRight' })
    expect(radio('A').checked).toBe(true)
  })
})
