import { describe, expect, it } from 'vitest'

import {
  isNextLessonPaid,
  isPackagePaid,
  isUnpaidAfter,
  laterPackageBarLabel,
  laterPackageCounts,
  laterPackages,
  laterPackageUsage,
  nextBookingPackageNo,
  nextPaymentPackageNo,
  owesPayment,
  packageBarLabel,
  packageCaption,
  packageCounts,
  packageTitle,
  packageUsage,
  paidAheadPackageNo,
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

  it('says a group owes while lessons pass what’s paid or its package isn’t paid yet', () => {
    // Herman, 2 Oct 2026: if it isn't paid yet, it says Unpaid.
    expect(owesPayment({ ...aimanSofia, unpaid: false })).toBe(false)
    expect(owesPayment({ ...weiJie, unpaid: true })).toBe(true)
    // A paid package with a lesson booked past it (the view's unpaid).
    expect(owesPayment({ ...sofia, unpaid: true })).toBe(true)
    // A new group that hasn't paid, and a package used up with nothing booked.
    expect(owesPayment({ ...neverPaid, package_no: 1, unpaid: false })).toBe(true)
    const usedUp = { package_size: 4, paid_lessons: 4, package_no: 2, unpaid: false }
    expect(owesPayment(usedUp)).toBe(true)
    // A paused group that used up what it paid owes nothing; lessons past it still count.
    expect(owesPayment(usedUp, false)).toBe(false)
    expect(owesPayment({ ...usedUp, unpaid: true }, false)).toBe(true)
  })
})

describe('isUnpaidAfter', () => {
  it('says when a booking would go past the lessons paid for', () => {
    expect(isUnpaidAfter(aimanSofia, 2)).toBe(false)
    expect(isUnpaidAfter(aimanSofia, 3)).toBe(true)
    expect(isUnpaidAfter(sofia, 1)).toBe(true)
  })
})

// Herman's tester, 7 Oct 2026: a 1-to-1 group with Package 1 paid.
const tester = (paid: number, booked: number, used = 0) => {
  const usedInPackage = used % 4
  const bookedInPackage = Math.min(booked, 4 - usedInPackage)
  return {
    package_size: 4,
    paid_lessons: paid,
    used_lessons: used,
    booked_lessons: booked,
    package_no: Math.floor(used / 4) + 1,
    used_in_package: usedInPackage,
    booked_in_package: bookedInPackage,
    left_in_package: 4 - usedInPackage - bookedInPackage,
  }
}

describe('paidAheadPackageNo', () => {
  it('allows one package past the last package with a lesson, then waits for a lesson in it', () => {
    expect(paidAheadPackageNo(tester(4, 4))).toBeNull()
    // Package 2 paid, nothing booked in it: the next payment waits for a lesson there.
    expect(paidAheadPackageNo(tester(8, 4))).toBe(2)
    expect(paidAheadPackageNo(tester(8, 5))).toBeNull()
    expect(paidAheadPackageNo(tester(12, 5))).toBe(3)
    // A new group pays for Package 1 once before it books.
    expect(paidAheadPackageNo(tester(0, 0))).toBeNull()
    expect(paidAheadPackageNo(tester(4, 0))).toBe(1)
    // A free lesson: 5 paid with Package 1 booked still allows a package.
    expect(paidAheadPackageNo(tester(5, 4))).toBeNull()
    expect(paidAheadPackageNo(tester(9, 4))).toBe(2)
  })

  it('never stops a payment from a group that owes one', () => {
    for (let paid = 0; paid <= 16; paid += 1) {
      for (let used = 0; used <= 16; used += 1) {
        for (let booked = 0; booked <= 12; booked += 1) {
          const balance = { ...tester(paid, booked, used), unpaid: used + booked > paid }
          if (owesPayment(balance)) {
            expect(
              paidAheadPackageNo(balance),
              `paid ${paid}, used ${used}, booked ${booked}`,
            ).toBeNull()
          }
        }
      }
    }
  })
})

describe('laterPackages', () => {
  it('lists the packages after the current one with lessons booked in them', () => {
    // Package 1 with its 4 lessons booked and 1 more: Package 2 with 1 booked, 3 left.
    const [next, ...rest] = laterPackages(tester(4, 5))
    expect(next).toEqual({ package_no: 2, package_size: 4, booked: 1, left: 3 })
    expect(rest).toEqual([])
    expect(laterPackageCounts(next)).toBe('1 booked · 3 left to book')
    expect(laterPackageUsage(next)).toBe('1 booked · 3 left')
    expect(laterPackageBarLabel(next)).toBe('1 booked, 3 left of 4')
    // After 2 lessons used, 2 booked in Package 1 and 6 past it: Packages 2 and 3.
    expect(laterPackages(tester(8, 8, 2)).map((later) => laterPackageCounts(later))).toEqual([
      '4 booked · fully booked',
      '2 booked · 2 left to book',
    ])
  })

  it('lists none while the current package has room', () => {
    expect(laterPackages(aimanSofia)).toEqual([])
    expect(laterPackages(sofia)).toEqual([])
    expect(laterPackages(tester(4, 4))).toEqual([])
  })
})
