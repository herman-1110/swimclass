import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RadioGroup } from './RadioGroup'

afterEach(cleanup)

const methods = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'fpx', label: 'FPX' },
] as const

function PaidBy({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('cash')
  return (
    <RadioGroup
      legend="Paid by"
      name="pay-method"
      options={methods}
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

const radio = (name: string) => screen.getByRole<HTMLInputElement>('radio', { name })

describe('RadioGroup', () => {
  it('is a group of native radios of one name, named by its legend', () => {
    render(<PaidBy />)
    expect(screen.getByRole('group', { name: 'Paid by' })).toBeTruthy()
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('name'))).toEqual([
      'pay-method',
      'pay-method',
      'pay-method',
    ])
    expect(radio('Cash').checked).toBe(true)
    expect(radio('Transfer').checked).toBe(false)
  })

  it('chooses by click and by arrow keys', () => {
    const onChange = vi.fn()
    render(<PaidBy onChange={onChange} />)
    fireEvent.click(radio('FPX'))
    expect(onChange).toHaveBeenLastCalledWith('fpx')
    expect(radio('FPX').checked).toBe(true)
    fireEvent.keyDown(radio('FPX'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('cash')
    expect(radio('Cash').checked).toBe(true)
    expect(document.activeElement).toBe(radio('Cash'))
  })

  it('starts with nothing chosen when the value is empty, and shows an error', () => {
    render(
      <RadioGroup
        legend="Paid by"
        name="pay-method"
        options={methods}
        value=""
        onChange={() => {}}
        error="Choose how they paid: Cash, Transfer or FPX."
      />,
    )
    expect(screen.getAllByRole('radio').some((r) => (r as HTMLInputElement).checked)).toBe(false)
    const group = screen.getByRole('group', { name: 'Paid by' })
    const errorId = group.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(errorId)?.textContent).toBe(
      'Choose how they paid: Cash, Transfer or FPX.',
    )
  })

  it('can disable one option or the whole group', () => {
    const { rerender } = render(
      <RadioGroup
        legend="Paid by"
        name="pay-method"
        options={[...methods.slice(0, 2), { value: 'fpx', label: 'FPX', disabled: true }]}
        value="cash"
        onChange={() => {}}
      />,
    )
    expect(radio('FPX').disabled).toBe(true)
    rerender(
      <RadioGroup
        legend="Paid by"
        name="pay-method"
        options={methods}
        value="cash"
        onChange={() => {}}
        disabled
      />,
    )
    expect(screen.getByRole('group', { name: 'Paid by' }).hasAttribute('disabled')).toBe(true)
  })
})
