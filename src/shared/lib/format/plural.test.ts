import { describe, expect, it } from 'vitest'

import { plural } from './plural'

describe('plural', () => {
  it('uses the singular for exactly one', () => {
    expect(plural(1, 'lesson')).toBe('1 lesson')
    expect(plural(1, 'more lesson')).toBe('1 more lesson')
  })

  it('adds "s" for every other count, zero included', () => {
    expect(plural(2, 'lesson')).toBe('2 lessons')
    expect(plural(0, 'lesson')).toBe('0 lessons')
    expect(plural(3, 'more lesson')).toBe('3 more lessons')
    expect(plural(4, 'week')).toBe('4 weeks')
  })

  it('takes an irregular plural', () => {
    expect(plural(2, 'person', 'people')).toBe('2 people')
    expect(plural(1, 'person', 'people')).toBe('1 person')
  })
})
