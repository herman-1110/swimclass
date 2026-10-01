import { describe, expect, it } from 'vitest'

import { timeOptions } from './timeOptions'

describe('timeOptions', () => {
  it('offers 5:00 am to 11:00 pm every 15 minutes', () => {
    const options = timeOptions()
    expect(options).toHaveLength(73)
    expect(options.slice(0, 3)).toEqual([
      { value: '05:00', label: '5:00 am' },
      { value: '05:15', label: '5:15 am' },
      { value: '05:30', label: '5:30 am' },
    ])
    expect(options.find((option) => option.value === '12:00')?.label).toBe('12:00 pm')
    expect(options.at(-1)).toEqual({ value: '23:00', label: '11:00 pm' })
  })

  it('adds a saved time that isn’t on the grid, in its place', () => {
    const options = timeOptions(['17:30', '24:00', '04:00', '17:40', '', '17:30:30'])
    expect(options).toHaveLength(77)
    expect(options[0]).toEqual({ value: '04:00', label: '4:00 am' })
    expect(options.at(-1)).toEqual({ value: '24:00', label: '12:00 am' })
    const values = options.map((option) => option.value)
    expect(values.slice(values.indexOf('17:30'), values.indexOf('17:45') + 1)).toEqual([
      '17:30',
      '17:30:30',
      '17:40',
      '17:45',
    ])
  })
})
