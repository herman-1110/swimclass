import { describe, expect, it } from 'vitest'

import {
  isUnpaidAfter,
  lessonsLeftAfter,
  nextBookingPackageNo,
  nextPaymentPackageNo,
  packageBarLabel,
  packageCaption,
  packageCounts,
  packageTitle,
  packageUsage,
} from './packages'

// Seed balances at DEMO_NOW (data-contracts Appendix C).
const aimanSofia = {
  package_size: 4,
  paid_lessons: 16,
  used_lessons: 12,
  booked_lessons: 2,
  package_no: 4,
  used_in_package: 0,
  booked_in_package: 2,
  left_in_package: 2,
}
const sofia = {
  package_size: 4,
  paid_lessons: 8,
  used_lessons: 7,
  booked_lessons: 1,
  package_no: 2,
  used_in_package: 3,
  booked_in_package: 1,
  left_in_package: 0,
}
const weiJie = {
  package_size: 4,
  paid_lessons: 4,
  used_lessons: 6,
  booked_lessons: 1,
  package_no: 2,
  used_in_package: 2,
  booked_in_package: 1,
  left_in_package: 1,
}
const nurul = { ...weiJie, paid_lessons: 4, used_lessons: 2, package_no: 1 }

describe('package words', () => {
  it('titles the card with the type and the package number', () => {
    expect(packageTitle('1-to-2', aimanSofia)).toBe('1-to-2 · Package 4')
  })

  it('counts what is used, booked and left, or says the package is fully booked', () => {
    expect(packageCounts(aimanSofia)).toBe('0 used · 2 booked · 2 left to book')
    expect(packageCounts(sofia)).toBe('3 used · 1 booked · fully booked')
  })

  it('puts the package number first in My classes’ caption', () => {
    expect(packageCaption(aimanSofia)).toBe('Package 4 · 0 used · 2 booked · 2 left to book')
    expect(packageCaption(sofia)).toBe('Package 2 · 3 used · 1 booked · fully booked')
  })

  it('gives the Students table its short counts and the bar a fuller name', () => {
    expect(packageUsage(weiJie)).toBe('2 used · 1 booked')
    expect(packageBarLabel(aimanSofia)).toBe('0 used, 2 booked, 2 left of 4')
  })
})

describe('package numbers', () => {
  it('finds the package the next booking goes into', () => {
    expect(nextBookingPackageNo(aimanSofia)).toBe(4)
    expect(nextBookingPackageNo(sofia)).toBe(3)
    // Booked lessons already a whole package ahead: still the right one (book spec C15).
    expect(nextBookingPackageNo({ ...sofia, booked_lessons: 5 })).toBe(4)
  })

  it('finds the package the next payment pays for', () => {
    expect(nextPaymentPackageNo({ package_size: 4, paid_lessons: 20 })).toBe(6)
    expect(nextPaymentPackageNo(weiJie)).toBe(2)
    expect(nextPaymentPackageNo({ package_size: 4, paid_lessons: 16 })).toBe(5)
  })
})

describe('lessonsLeftAfter', () => {
  it('counts what a booking leaves in its package', () => {
    expect(lessonsLeftAfter(aimanSofia, 1)).toBe(1)
    expect(lessonsLeftAfter(aimanSofia, 2)).toBe(0)
    // Sofia's package is full: a new lesson starts Package 3, which then has 3 left.
    expect(lessonsLeftAfter(sofia, 1)).toBe(3)
  })

  it('goes below 0 when a 2-hour lesson spills into the next package', () => {
    expect(lessonsLeftAfter(nurul, 2)).toBe(-1)
    expect(lessonsLeftAfter(weiJie, 1)).toBe(0)
  })
})

describe('isUnpaidAfter', () => {
  it('says when a booking would go past the lessons paid for', () => {
    expect(isUnpaidAfter(aimanSofia, 2)).toBe(false)
    expect(isUnpaidAfter(aimanSofia, 3)).toBe(true)
    expect(isUnpaidAfter(sofia, 1)).toBe(true)
  })
})
