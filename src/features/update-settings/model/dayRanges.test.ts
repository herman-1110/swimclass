import { describe, expect, it } from 'vitest'

import { validateDayRanges } from './dayRanges'

const range = (opens_at: string, closes_at: string) => ({ opens_at, closes_at })

describe('validateDayRanges', () => {
  it('passes the seed’s Saturday and a closed day', () => {
    expect(validateDayRanges([range('07:00', '12:00'), range('16:00', '22:00')])).toEqual([
      null,
      null,
    ])
    expect(validateDayRanges([])).toEqual([])
  })

  it('lets ranges touch: they join into one window', () => {
    expect(validateDayRanges([range('16:00', '17:30'), range('17:30', '22:00')])).toEqual([
      null,
      null,
    ])
  })

  it('asks for both times first, pointing at the select left on "Choose"', () => {
    expect(validateDayRanges([range('', '22:00'), range('17:00', ''), range('', '')])).toEqual([
      { code: 'hours_incomplete', from: true, to: false },
      { code: 'hours_incomplete', from: false, to: true },
      { code: 'hours_incomplete', from: true, to: true },
    ])
  })

  it('then wants the end after the start', () => {
    expect(validateDayRanges([range('22:00', '17:30'), range('18:00', '18:00')])).toEqual([
      { code: 'invalid_range', from: true, to: true },
      { code: 'invalid_range', from: true, to: true },
    ])
    // Before the 5:00 am–11:00 pm rule: 4:00 am to 3:00 am is backwards first.
    expect(validateDayRanges([range('04:00', '03:00')])[0]?.code).toBe('invalid_range')
  })

  it('then keeps the hours between 5:00 am and 11:00 pm, pointing at the time outside', () => {
    expect(
      validateDayRanges([
        range('04:45', '12:00'),
        range('17:30', '24:00'),
        range('05:00', '23:00'),
      ]),
    ).toEqual([
      { code: 'hours_out_of_range', from: true, to: false },
      { code: 'hours_out_of_range', from: false, to: true },
      null,
    ])
  })

  it('then finds overlaps, under the later range (identical ranges overlap too)', () => {
    expect(validateDayRanges([range('17:30', '20:00'), range('19:00', '22:00')])).toEqual([
      null,
      { code: 'overlapping_rules', from: true, to: true },
    ])
    expect(validateDayRanges([range('07:00', '12:00'), range('07:00', '12:00')])[1]?.code).toBe(
      'overlapping_rules',
    )
  })

  it('compares overlaps only with ranges that are fine themselves', () => {
    expect(
      validateDayRanges([range('', '22:00'), range('17:30', '20:00'), range('20:00', '22:00')]),
    ).toEqual([{ code: 'hours_incomplete', from: true, to: false }, null, null])
  })
})
