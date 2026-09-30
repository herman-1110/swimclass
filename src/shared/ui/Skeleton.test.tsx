import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Skeleton } from './Skeleton'

afterEach(cleanup)

describe('Skeleton', () => {
  it('is hidden from screen readers and takes the size it is given', () => {
    const { container } = render(<Skeleton className="h-12" />)
    const block = container.firstElementChild as HTMLElement
    expect(block.getAttribute('aria-hidden')).toBe('true')
    expect(block.className).toContain('h-12')
    expect(block.className).toContain('rounded-control')
    // The pulse stops for people who ask for less motion.
    expect(block.className).toContain('motion-reduce:animate-none')
  })

  it('takes the corners of what it stands in for', () => {
    const { container } = render(
      <>
        <Skeleton shape="line" className="h-3.5 w-40" />
        <Skeleton shape="circle" className="size-9" />
        <Skeleton shape="frame" className="h-24" />
      </>,
    )
    const [line, circle, frame] = Array.from(container.children)
    expect(line.className).toContain('rounded-sm')
    expect(circle.className).toContain('rounded-full')
    expect(frame.className).toContain('rounded-frame')
  })
})
