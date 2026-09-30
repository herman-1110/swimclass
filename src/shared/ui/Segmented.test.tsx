import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Segmented } from './Segmented'

afterEach(cleanup)

const types = [
  { value: '1', label: '1-to-1' },
  { value: '2', label: '1-to-2' },
  { value: '3', label: '1-to-3' },
] as const

function LessonType({
  onChange,
  options = types,
}: {
  onChange?: (value: string) => void
  options?: readonly { value: string; label: string; disabled?: boolean }[]
}) {
  const [value, setValue] = useState('3')
  return (
    <Segmented
      name="add-type"
      legend="Lesson type"
      help="Up to 3 students from the same account per lesson."
      options={options}
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

const radio = (name: string) => screen.getByRole<HTMLInputElement>('radio', { name })

describe('Segmented', () => {
  it('is a radio group named by its legend, one segment chosen', () => {
    render(<LessonType />)
    const group = screen.getByRole('group', { name: 'Lesson type' })
    expect(group.getAttribute('aria-describedby')).toMatch(/-help$/)
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(radio('1-to-3').checked).toBe(true)
    expect(radio('1-to-1').checked).toBe(false)
    // The radios are visually hidden; the segment around each shows the choice and focus.
    expect(radio('1-to-3').className).toBe('sr-only')
  })

  it('chooses a segment when it is pressed', () => {
    const onChange = vi.fn()
    render(<LessonType onChange={onChange} />)
    fireEvent.click(screen.getByText('1-to-1'))
    expect(onChange).toHaveBeenCalledWith('1')
    expect(radio('1-to-1').checked).toBe(true)
  })

  it('moves the choice with the arrow keys, wrapping at the ends', () => {
    const onChange = vi.fn()
    render(<LessonType onChange={onChange} />)
    fireEvent.keyDown(radio('1-to-3'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('1')
    expect(radio('1-to-1').checked).toBe(true)
    expect(document.activeElement).toBe(radio('1-to-1'))
    fireEvent.keyDown(radio('1-to-1'), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('3')
    fireEvent.keyDown(radio('1-to-3'), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('2')
  })

  it('skips a disabled segment', () => {
    const onChange = vi.fn()
    render(
      <LessonType
        onChange={onChange}
        options={[types[0], { ...types[1], disabled: true }, types[2]]}
      />,
    )
    expect(radio('1-to-2').disabled).toBe(true)
    fireEvent.keyDown(radio('1-to-3'), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('1')
  })

  it('keeps a hidden legend as the name (Book’s lesson length)', () => {
    render(
      <Segmented
        name="book-length"
        legend="Lesson length"
        hideLegend
        maxWidth="narrow"
        options={[
          { value: '60', label: '1 hour' },
          { value: '120', label: '2 hours' },
        ]}
        value="60"
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('group', { name: 'Lesson length' })).toBeTruthy()
    expect(radio('1 hour').checked).toBe(true)
  })
})
