import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { GroupOptionPreview } from './GroupOptionPreview'

afterEach(cleanup)

describe('GroupOptionPreview', () => {
  it('shows the names and the type tag as the customer’s chosen row, with nothing to press', () => {
    const { container } = render(
      <GroupOptionPreview names="Adam, Alya & Amir" typeLabel="1-to-3" />,
    )
    expect(screen.getByText('Adam, Alya & Amir')).toBeTruthy()
    expect(screen.getByText('1-to-3')).toBeTruthy()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(container.querySelector('input')).toBeNull()
    // The drawn radio mark is decoration.
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy()
  })
})
