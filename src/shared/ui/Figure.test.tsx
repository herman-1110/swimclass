import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Figure } from './Figure'

afterEach(cleanup)

describe('Figure', () => {
  it('shows the number over its caption, the number in orange when it needs attention', () => {
    render(<Figure value="2" caption="Unpaid · Hana, Wei Jie" tone="warn" />)
    expect(screen.getByText('2').className).toContain('text-warn')
    expect(screen.getByText('Unpaid · Hana, Wei Jie').className).toContain('text-muted')
  })

  it('wraps a caption of long names inside a word, and can shrink in its row', () => {
    const caption = `Unpaid · ${'Wolfeschlegelsteinhausenbergerdorff'.repeat(3)}`
    const { container } = render(<Figure value="3" caption={caption} />)
    expect(screen.getByText(caption).className).toContain('wrap-anywhere')
    expect(container.firstElementChild?.className).toContain('min-w-0')
  })
})
