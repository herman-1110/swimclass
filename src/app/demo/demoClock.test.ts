import { describe, expect, it } from 'vitest'

import { demoClockText, sentAtText } from './demoClock'

// The tests run in America/Los_Angeles, so these also check that Malaysia time is used.

describe('demoClockText', () => {
  it('writes the demo clock as the drawings do', () => {
    expect(demoClockText()).toBe('Sat 26 Sep 2026, 12:00 pm')
  })

  it('writes any other moment in Malaysia time', () => {
    expect(demoClockText('2026-12-31T16:30:00Z')).toBe('Fri 1 Jan 2027, 12:30 am')
  })
})

describe('sentAtText', () => {
  it('writes the day and time an email was sent, in Malaysia time', () => {
    expect(sentAtText('2026-09-30T14:15:00.123+00:00')).toBe('Wed 30 Sep, 10:15 pm')
  })
})
