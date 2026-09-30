import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CoachScheduleLegend } from './CoachScheduleLegend'
import { CustomerScheduleLegend } from './CustomerScheduleLegend'

afterEach(cleanup)

function items() {
  return within(screen.getByRole('list', { name: 'Legend' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

describe('the schedule legends', () => {
  it('names the customer grid’s five colours in the drawn order', () => {
    render(<CustomerScheduleLegend />)
    expect(items()).toEqual(['Free', 'Booked', 'Travel', 'Yours', 'Closed'])
  })

  it('names the coach grid’s three colours, from 768 px only', () => {
    render(<CoachScheduleLegend />)
    expect(items()).toEqual(['Lesson', 'Travel gap', 'Closed'])
    expect(screen.getByRole('list', { name: 'Legend' }).className).toContain('hidden md:flex')
  })
})
