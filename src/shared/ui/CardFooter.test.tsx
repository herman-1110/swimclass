import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CardFooter } from './CardFooter'

afterEach(cleanup)

describe('CardFooter', () => {
  it('sits at the bottom on phones, and under a hairline in the card from 768 px', () => {
    render(
      <CardFooter>
        <button type="button">Log out</button>
        <p>Signed in as Wai Ting (waiting).</p>
      </CardFooter>,
    )
    const foot = screen.getByRole('button', { name: 'Log out' }).parentElement
    expect(foot?.className.split(' ')).toEqual(
      expect.arrayContaining([
        'mt-auto',
        'items-center',
        'gap-0.5',
        'text-center',
        'md:mt-2',
        'md:border-t',
        'md:border-line',
        'md:pt-6',
      ]),
    )
    expect(foot?.textContent).toBe('Log outSigned in as Wai Ting (waiting).')
  })
})
