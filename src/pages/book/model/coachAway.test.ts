import { describe, expect, it } from 'vitest'

import { coachAwayText } from './coachAway'

const range = (from: string, to: string) => ({
  starts_at: `2026-10-03T${from}:00+08:00`,
  ends_at: `2026-10-03T${to}:00+08:00`,
})

describe('coachAwayText', () => {
  it('says nothing for a day without blocked time', () => {
    expect(coachAwayText({ open: [range('07:00', '12:00')], closed: [] })).toBeNull()
  })

  it('says the coach isn’t available on a day Block time took all of', () => {
    expect(coachAwayText({ open: [], closed: [range('00:00', '23:59')] })).toEqual({
      text: 'Your coach isn’t available on this day. Try another day.',
      wholeDay: true,
    })
  })

  it('names the blocked times inside a day that still has open hours', () => {
    expect(
      coachAwayText({ open: [range('16:00', '22:00')], closed: [range('07:00', '12:00')] }),
    ).toEqual({ text: 'Your coach isn’t available 7:00 am–12:00 pm.', wholeDay: false })
    expect(
      coachAwayText({
        open: [range('07:00', '09:00'), range('16:00', '22:00')],
        closed: [range('09:00', '12:00'), range('18:00', '19:00')],
      })?.text,
    ).toBe('Your coach isn’t available 9:00 am–12:00 pm and 6:00–7:00 pm.')
  })
})
