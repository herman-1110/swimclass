import { describe, expect, it } from 'vitest'

import { openedBy, readFilter, withParams } from './params'

describe('readFilter', () => {
  it('reads the tabs, and anything else as All', () => {
    expect(readFilter('unpaid')).toBe('unpaid')
    expect(readFilter('last-lesson')).toBe('last-lesson')
    expect(readFilter('paid')).toBe('paid')
    expect(readFilter('waiting')).toBe('waiting')
    expect(readFilter(null)).toBe('all')
    expect(readFilter('all')).toBe('all')
    expect(readFilter('Unpaid')).toBe('all')
  })
})

describe('withParams', () => {
  it('sets and removes params, keeping the others', () => {
    const params = new URLSearchParams('filter=paid&pay=g1')
    expect(withParams(params, { pay: null, history: 'g2' }).toString()).toBe(
      'filter=paid&history=g2',
    )
    expect(params.toString()).toBe('filter=paid&pay=g1')
  })
})

describe('openedBy', () => {
  it('says which panel an entry was pushed for', () => {
    expect(openedBy({ opened: 'pay' })).toBe('pay')
    expect(openedBy({ opened: 'history' })).toBe('history')
    expect(openedBy({ opened: 'other' })).toBeNull()
    expect(openedBy(null)).toBeNull()
    expect(openedBy(undefined)).toBeNull()
  })
})
