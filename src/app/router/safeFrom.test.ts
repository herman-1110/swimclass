import { describe, expect, it } from 'vitest'

import { safeFrom } from './safeFrom'

describe('safeFrom', () => {
  it('keeps a page of this site, with its query string', () => {
    expect(safeFrom({ from: '/my-classes' })).toBe('/my-classes')
    expect(safeFrom({ from: '/book?day=2026-09-29&group=g1' })).toBe(
      '/book?day=2026-09-29&group=g1',
    )
  })

  it('refuses addresses that could lead to another site', () => {
    expect(safeFrom({ from: '//evil.example/book' })).toBeNull()
    expect(safeFrom({ from: '/\\evil.example' })).toBeNull()
    expect(safeFrom({ from: 'https://evil.example' })).toBeNull()
    expect(safeFrom({ from: 'book' })).toBeNull()
  })

  it('gives null without a usable state', () => {
    expect(safeFrom(null)).toBeNull()
    expect(safeFrom(undefined)).toBeNull()
    expect(safeFrom('/book')).toBeNull()
    expect(safeFrom({})).toBeNull()
    expect(safeFrom({ from: 42 })).toBeNull()
  })
})
