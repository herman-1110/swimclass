import { describe, expect, it } from 'vitest'

import { isBlank, pinnedLine, removeMessageName } from './copy'

describe('Message all customers’ words', () => {
  it('has nothing to send while the text is blank', () => {
    expect(isBlank('')).toBe(true)
    expect(isBlank(' \n\t ')).toBe(true)
    expect(isBlank(' Pool closed ')).toBe(false)
  })

  it('says when a pinned message was posted and whether customers see it (§3.7)', () => {
    // 30 Sep 23:30 UTC is already 1 Oct in Malaysia.
    expect(pinnedLine('2026-09-30T23:30:00+00:00', true)).toBe(
      'Posted Thu 1 Oct · Customers see this one',
    )
    expect(pinnedLine('2026-09-26T04:00:00+00:00', false)).toBe(
      'Posted Sat 26 Sep · Shows again if you remove the newer ones',
    )
  })

  it('gives Remove a full name', () => {
    expect(removeMessageName('2026-09-26T04:00:00+00:00')).toBe('message posted Sat 26 Sep')
  })
})
