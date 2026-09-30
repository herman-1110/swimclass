import { describe, expect, it } from 'vitest'

import { splitByPartOfDay } from './partOfDay'

// week_slots sends starts_at as UTC text; the split is by the MYT clock. The tests run in
// America/Los_Angeles, where these are all the day before.
const at = (utc: string) => ({ starts_at: utc })

describe('splitByPartOfDay', () => {
  it('puts starts before noon MYT in the morning and the rest in the evening', () => {
    const { morning, evening } = splitByPartOfDay([
      at('2026-10-02T23:00:00+00:00'), // Sat 3 Oct 7:00 am
      at('2026-10-03T03:30:00+00:00'), // 11:30 am
      at('2026-10-03T04:00:00+00:00'), // 12:00 pm
      at('2026-10-03T11:00:00+00:00'), // 7:00 pm
    ])
    expect(morning).toEqual([at('2026-10-02T23:00:00+00:00'), at('2026-10-03T03:30:00+00:00')])
    expect(evening).toEqual([at('2026-10-03T04:00:00+00:00'), at('2026-10-03T11:00:00+00:00')])
  })

  it('keeps each part in the order given, and leaves a part empty when it has nothing', () => {
    const { morning, evening } = splitByPartOfDay([
      at('2026-09-29T13:00:00+00:00'), // Tue 29 Sep 9:00 pm
      at('2026-09-29T11:30:00+00:00'), // 7:30 pm
    ])
    expect(morning).toEqual([])
    expect(evening).toEqual([at('2026-09-29T13:00:00+00:00'), at('2026-09-29T11:30:00+00:00')])
  })
})
