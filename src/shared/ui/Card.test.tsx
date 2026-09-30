import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Card } from './Card'

afterEach(cleanup)

describe('Card', () => {
  it('is a framed box, as the element the page asks for', () => {
    render(
      <Card as="aside" aria-label="Booking summary" className="flex flex-col gap-3">
        Tue 29 Sep
      </Card>,
    )
    const card = screen.getByRole('complementary', { name: 'Booking summary' })
    expect(card.className.split(' ')).toEqual(
      expect.arrayContaining(['rounded-frame', 'border-frame', 'p-5', 'flex', 'gap-3']),
    )
  })

  it('can be flat on phones and framed from 768 px', () => {
    render(
      <Card as="section" aria-label="Packages" padding="list" framedFrom="md">
        Packages
      </Card>,
    )
    const classes = screen.getByRole('region', { name: 'Packages' }).className.split(' ')
    expect(classes).toEqual(expect.arrayContaining(['md:border', 'md:px-5', 'md:pt-1', 'md:pb-2']))
    expect(classes).not.toContain('border')
    expect(classes).not.toContain('px-5')
  })
})
