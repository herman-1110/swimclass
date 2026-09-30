import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SegmentBar } from './SegmentBar'

afterEach(cleanup)

function segments(container: HTMLElement) {
  return [...(container.firstElementChild?.children ?? [])].map((segment) =>
    segment.className.includes('bg-accent')
      ? 'used'
      : segment.className.includes('bg-seg-booked')
        ? 'booked'
        : 'free',
  )
}

describe('SegmentBar', () => {
  it('draws one segment per lesson: used, then booked, then free', () => {
    const { container } = render(<SegmentBar total={4} used={1} booked={2} />)
    expect(segments(container)).toEqual(['used', 'booked', 'booked', 'free'])
  })

  it('is hidden from screen readers unless it is given a name', () => {
    const { container, rerender } = render(<SegmentBar total={4} used={0} booked={2} />)
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
    rerender(<SegmentBar total={4} used={0} booked={2} label="0 used, 2 booked, 2 left of 4" />)
    expect(screen.getByRole('img', { name: '0 used, 2 booked, 2 left of 4' })).toBeTruthy()
  })

  it('stays inside the package when the counts run past it', () => {
    const { container } = render(<SegmentBar total={4} used={3} booked={2} />)
    expect(segments(container)).toEqual(['used', 'used', 'used', 'booked'])
  })

  it('keeps the table’s 113 px and 3 px gaps for any package size', () => {
    const { container } = render(
      <SegmentBar total={12} used={2} booked={1} size="md" width="fixed" />,
    )
    const bar = container.firstElementChild
    expect(bar?.children).toHaveLength(12)
    expect(bar?.className.split(' ')).toEqual(expect.arrayContaining(['gap-[3px]', 'w-[113px]']))
  })

  it('draws nothing for an empty package', () => {
    const { container } = render(<SegmentBar total={0} used={0} booked={0} />)
    expect(container.firstElementChild).toBeNull()
  })
})
