import { describe, expect, it } from 'vitest'

import { possessive } from './possessive'

describe('possessive', () => {
  it('adds a typographic ’s', () => {
    expect(possessive('Mei Ling')).toBe('Mei Ling’s')
    expect(possessive('Aiman & Sofia')).toBe('Aiman & Sofia’s')
    expect(possessive('James')).toBe('James’s')
  })
})
