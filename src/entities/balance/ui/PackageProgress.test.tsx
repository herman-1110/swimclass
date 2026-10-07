import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { GroupBalance } from '../model/types'
import { PackageProgress } from './PackageProgress'

afterEach(cleanup)

// Wei Jie at DEMO_NOW (AdminStudents.dc.html row 2).
const weiJie: GroupBalance = {
  group_id: 'c0000000-0000-4000-8000-000000000004',
  account_id: 'a0000000-0000-4000-8000-000000000004',
  package_size: 4,
  paid_lessons: 4,
  used_lessons: 6,
  booked_lessons: 1,
  package_no: 2,
  used_in_package: 2,
  booked_in_package: 1,
  left_in_package: 1,
  unpaid: true,
  unpaid_since: '2026-09-18T11:30:00+00:00',
  can_still_book: 1,
  last_lesson_at: null,
  last_paid_on: '2026-08-16',
  last_payment_method: 'fpx',
}

describe('PackageProgress', () => {
  it('stacks the package, a 113 px bar and the counts in the table', () => {
    render(<PackageProgress balance={weiJie} variant="table" />)
    const bar = screen.getByRole('img', { name: '2 used, 1 booked, 1 left of 4' })
    expect(bar.className).toContain('w-[113px]')
    expect(bar.children).toHaveLength(4)
    expect(bar.previousElementSibling?.textContent).toBe('Package 2')
    expect(bar.nextElementSibling?.textContent).toBe('2 used · 1 booked')
  })

  it('puts the package and the counts on one line over a full-width bar on cards', () => {
    render(<PackageProgress balance={weiJie} variant="card" />)
    const bar = screen.getByRole('img', { name: '2 used, 1 booked, 1 left of 4' })
    expect(bar.className).not.toContain('w-[113px]')
    expect(bar.previousElementSibling?.textContent).toBe('Package 22 used · 1 booked')
  })

  it('adds each later package with lessons booked in it (Herman, 7 Oct 2026)', () => {
    // The tester: Package 1 paid, its 4 lessons booked and 1 more past it.
    const tester: GroupBalance = {
      ...weiJie,
      paid_lessons: 4,
      used_lessons: 0,
      booked_lessons: 5,
      package_no: 1,
      used_in_package: 0,
      booked_in_package: 4,
      left_in_package: 0,
    }
    for (const variant of ['table', 'card'] as const) {
      render(<PackageProgress balance={tester} variant={variant} />)
      expect(screen.getByRole('img', { name: '0 used, 4 booked, 0 left of 4' })).toBeTruthy()
      const later = screen.getByRole('img', { name: '1 booked, 3 left of 4' })
      expect(later.children).toHaveLength(4)
      expect(screen.getByText('Package 2')).toBeTruthy()
      expect(screen.getByText('1 booked · 3 left')).toBeTruthy()
      cleanup()
    }
    render(<PackageProgress balance={weiJie} variant="table" />)
    expect(screen.getAllByRole('img')).toHaveLength(1)
  })
})
