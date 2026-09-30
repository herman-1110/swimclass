import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Fieldset } from './Fieldset'
import { OptionRow } from './OptionRow'
import { Tag } from './Tag'

afterEach(cleanup)

const groups = [
  { id: 'g1', names: 'Aiman & Sofia', type: '1-to-2' },
  { id: 'g2', names: 'Sofia', type: '1-to-1' },
  { id: 'g3', names: 'Adam, Alya & Amir', type: '1-to-3' },
]

function Picker({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('g1')
  return (
    <Fieldset legend="Who’s this lesson for?" spacing="loose">
      {groups.map((group) => (
        <OptionRow
          key={group.id}
          name="book-group"
          value={group.id}
          checked={value === group.id}
          onChange={(next) => {
            setValue(next)
            onChange?.(next)
          }}
          label={group.names}
          trailing={<Tag>{group.type}</Tag>}
        />
      ))}
    </Fieldset>
  )
}

const radio = (name: string) => screen.getByRole<HTMLInputElement>('radio', { name })

describe('OptionRow', () => {
  it('is a native radio named by its label and tag, in a group named by the legend', () => {
    render(<Picker />)
    expect(screen.getByRole('group', { name: 'Who’s this lesson for?' })).toBeTruthy()
    expect(radio('Aiman & Sofia 1-to-2').checked).toBe(true)
    expect(radio('Sofia 1-to-1').checked).toBe(false)
    expect(radio('Aiman & Sofia 1-to-2').getAttribute('name')).toBe('book-group')
  })

  it('chooses its value when any part of the row is pressed', () => {
    const onChange = vi.fn()
    render(<Picker onChange={onChange} />)
    fireEvent.click(screen.getByText('1-to-1'))
    expect(onChange).toHaveBeenCalledWith('g2')
    expect(radio('Sofia 1-to-1').checked).toBe(true)
    expect(radio('Aiman & Sofia 1-to-2').checked).toBe(false)
  })

  it('moves the choice with the arrow keys inside a Fieldset', () => {
    const onChange = vi.fn()
    render(<Picker onChange={onChange} />)
    fireEvent.keyDown(radio('Aiman & Sofia 1-to-2'), { key: 'ArrowDown' })
    expect(onChange).toHaveBeenLastCalledWith('g2')
    expect(document.activeElement).toBe(radio('Sofia 1-to-1'))
    fireEvent.keyDown(radio('Sofia 1-to-1'), { key: 'ArrowDown' })
    expect(onChange).toHaveBeenLastCalledWith('g3')
    fireEvent.keyDown(radio('Adam, Alya & Amir 1-to-3'), { key: 'ArrowDown' })
    expect(onChange).toHaveBeenLastCalledWith('g1')
    fireEvent.keyDown(radio('Aiman & Sofia 1-to-2'), { key: 'ArrowUp' })
    expect(onChange).toHaveBeenLastCalledWith('g3')
    expect(radio('Adam, Alya & Amir 1-to-3').checked).toBe(true)
  })

  it('can be disabled', () => {
    // The browser then ignores presses (jsdom's synthetic clicks don't model that).
    render(
      <OptionRow
        name="excuse"
        value="b"
        checked={false}
        onChange={() => {}}
        label="Tue 22 Sep, 7:30–8:30 pm"
        disabled
      />,
    )
    const option = radio('Tue 22 Sep, 7:30–8:30 pm')
    expect(option.disabled).toBe(true)
    expect(option.closest('label')?.className).toContain('has-disabled:opacity-50')
  })

  it('in preview shows the chosen look with no control', () => {
    render(<OptionRow preview label="Adam, Alya & Amir" trailing={<Tag>1-to-3</Tag>} />)
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.getByText('Adam, Alya & Amir')).toBeTruthy()
    const mark = screen.getByText('Adam, Alya & Amir').previousElementSibling
    expect(mark?.getAttribute('aria-hidden')).toBe('true')
  })
})
