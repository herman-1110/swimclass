import { describe, expect, it } from 'vitest'

import { accountOptionLabel, byDisplayName, bySignUp } from './accounts'
import type { Profile } from './types'

function profile(overrides: Partial<Profile>): Profile {
  return {
    id: 'a0000000-0000-4000-8000-000000000099',
    username: 'someone',
    display_name: 'Someone',
    phone: null,
    language: null,
    role: 'customer',
    approved: true,
    created_at: '2026-09-29T16:05:07.107+00:00',
    ...overrides,
  }
}

describe('accountOptionLabel', () => {
  it('writes the name and the username with a spaced middle dot', () => {
    expect(accountOptionLabel({ display_name: 'Mei Ling', username: 'meiling' })).toBe(
      'Mei Ling · meiling',
    )
  })
})

describe('byDisplayName', () => {
  it('sorts as people read names, not in byte order', () => {
    const names = [
      profile({ display_name: 'Zulaikha', username: 'zulaikha' }),
      profile({ display_name: 'aina', username: 'aina' }),
      profile({ display_name: 'Mei Ling', username: 'meiling' }),
    ]
    expect(names.toSorted(byDisplayName).map((p) => p.display_name)).toEqual([
      'aina',
      'Mei Ling',
      'Zulaikha',
    ])
  })

  it('breaks a tie on the name with the username', () => {
    const a = profile({ display_name: 'Siti', username: 'siti.b' })
    const b = profile({ display_name: 'Siti', username: 'siti.a' })
    expect([a, b].toSorted(byDisplayName).map((p) => p.username)).toEqual(['siti.a', 'siti.b'])
  })
})

describe('bySignUp', () => {
  it('puts the oldest sign-up first, then orders by id', () => {
    const late = profile({ id: 'b', created_at: '2026-09-30T08:00:00+00:00' })
    const early = profile({ id: 'c', created_at: '2026-09-30T07:59:59.5+00:00' })
    const sameAsLate = profile({ id: 'a', created_at: '2026-09-30T16:00:00+08:00' })
    expect([late, early, sameAsLate].toSorted(bySignUp).map((p) => p.id)).toEqual(['c', 'a', 'b'])
  })
})
