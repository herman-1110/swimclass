import { describe, expect, it } from 'vitest'

import { joinWithAnd } from './joinWithAnd'

describe('joinWithAnd', () => {
  it('joins the last two items with "and" and the rest with commas', () => {
    expect(joinWithAnd(['a'])).toBe('a')
    expect(joinWithAnd(['a', 'b'])).toBe('a and b')
    expect(joinWithAnd(['a', 'b', 'c'])).toBe('a, b and c')
    expect(joinWithAnd(['a', 'b', 'c', 'd'])).toBe('a, b, c and d')
  })

  it('gives an empty string for no items', () => {
    expect(joinWithAnd([])).toBe('')
  })
})
