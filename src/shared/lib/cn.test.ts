import { describe, expect, it } from 'vitest'

import { cn } from './cn'

describe('cn', () => {
  it('joins the class names that are set, in order', () => {
    const selected = false
    expect(cn('h-11 rounded-control', selected && 'bg-accent', null, undefined, '', 'px-4')).toBe(
      'h-11 rounded-control px-4',
    )
  })
})
