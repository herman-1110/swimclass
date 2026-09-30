import { describe, expect, it } from 'vitest'

import { clashMessage, unavailableTitle } from './clashMessage'
import type { SlotCheck } from './types'

const gapAfter: SlotCheck = {
  ok: false,
  reason: 'gap_after',
  detail: { ends_at: '2026-09-29T18:30:00+08:00' },
}

describe('clashMessage', () => {
  it('says nothing for a free start', () => {
    expect(clashMessage({ ok: true, reason: null, detail: null })).toBeNull()
  })

  it('gives the customer’s words for Book (DESIGN §6)', () => {
    expect(clashMessage(gapAfter, { gapMinutes: 60 })).toBe(
      'It starts too soon after the lesson that ends at 6:30 pm. Your coach needs 1 hour to travel between lessons.',
    )
    expect(
      clashMessage({
        ok: false,
        reason: 'overlap_mine',
        detail: {
          starts_at: '2026-10-03T09:00:00+08:00',
          ends_at: '2026-10-03T10:00:00+08:00',
          names: 'Aiman & Sofia',
        },
      }),
    ).toBe('It overlaps Aiman & Sofia’s lesson at 9:00–10:00 am.')
    expect(
      clashMessage({ ok: false, reason: 'outside_window', detail: null }, { windowWeeks: 4 }),
    ).toBe('You can book up to 4 weeks ahead.')
  })

  it('gives the coach’s words for Add booking', () => {
    expect(clashMessage(gapAfter, { audience: 'coach', gapMinutes: 60 })).toBe(
      'It starts too soon after the lesson that ends at 6:30 pm. You need 1 hour to travel between lessons. Turn on “Skip travel gap” to book it anyway.',
    )
    expect(
      clashMessage({ ok: false, reason: 'off_step', detail: null }, { audience: 'coach' }),
    ).toBe(
      'It starts between your usual start times. Turn on “Outside open hours” to book it anyway.',
    )
  })

  it('falls back to the generic message when a setting it needs is missing', () => {
    expect(clashMessage(gapAfter)).toBe('Something went wrong. Refresh the page and try again.')
  })
})

describe('unavailableTitle', () => {
  it('names the time in MYT', () => {
    expect(unavailableTitle({ starts_at: '2026-09-29T11:00:00+00:00' })).toBe(
      '7:00 pm isn’t available',
    )
  })
})
