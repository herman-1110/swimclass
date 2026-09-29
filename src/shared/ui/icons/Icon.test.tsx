import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ChevronLeftIcon } from './ChevronLeftIcon'

describe('icons', () => {
  it('draw in the text colour, hidden from screen readers, at the size asked for', () => {
    const { container } = render(<ChevronLeftIcon size={16} strokeWidth={1.8} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('stroke')).toBe('currentColor')
    expect(svg?.getAttribute('width')).toBe('16')
    expect(svg?.getAttribute('stroke-width')).toBe('1.8')
  })
})
