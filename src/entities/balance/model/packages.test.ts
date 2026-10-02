import { describe, expect, it } from 'vitest'

import {
  isNextLessonPaid,
  isPackagePaid,
  isUnpaidAfter,
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

describe('what payments cover', () => {
  const neverPaid = { ...aimanSofia, paid_lessons: 0, used_lessons: 0, booked_lessons: 0 }

  it('says whether the next lesson booked is paid for', () => {
    expect(isNextLessonPaid(aimanSofia)).toBe(true)
    expect(isNextLessonPaid(sofia)).toBe(false)
    expect(isNextLessonPaid(weiJie)).toBe(false)
    expect(isNextLessonPaid(neverPaid)).toBe(false)
    // A free lesson pays for the next one, though the package is fully booked.
    expect(isNextLessonPaid({ ...sofia, paid_lessons: 9 })).toBe(true)
  })

  it('says whether payments cover the whole current package', () => {
    expect(isPackagePaid(aimanSofia)).toBe(true)
    expect(isPackagePaid(sofia)).toBe(true)
    expect(isPackagePaid({ ...neverPaid, package_no: 1 })).toBe(false)
    // Every paid lesson used and none booked: the next package has begun, unpaid.
    expect(isPackagePaid({ package_size: 4, paid_lessons: 4, package_no: 2 })).toBe(false)
  })
})

describe('isUnpaidAfter', () => {
  it('says when a booking would go past the lessons paid for', () => {
    expect(isUnpaidAfter(aimanSofia, 2)).toBe(false)
    expect(isUnpaidAfter(aimanSofia, 3)).toBe(true)
    expect(isUnpaidAfter(sofia, 1)).toBe(true)
  })
})
