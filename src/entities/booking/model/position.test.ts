import { describe, expect, it } from 'vitest'

import {
  formatLessonPosition,
  lessonNumbers,
  packagePosition,
  positionOf,
  upcomingPosition,
} from './position'

const second = { package_no: 4, lesson_in_package: 2, lessons: 1 }
const twoHours = { package_no: 3, lesson_in_package: 1, lessons: 2 }
const acrossPackages = { package_no: 2, lesson_in_package: 4, lessons: 2 }

describe('lessonNumbers', () => {
  it('numbers a lesson in its package (the drawing)', () => {
    expect(lessonNumbers(second, 4)).toBe('lesson 2 of 4')
  })

  it('numbers both lessons of a 2-hour lesson', () => {
    expect(lessonNumbers(twoHours, 4)).toBe('lessons 1–2 of 4')
  })

  it('names both packages when a 2-hour lesson spans two', () => {
    expect(lessonNumbers(acrossPackages, 4)).toBe('last lesson of Package 2 and first of Package 3')
  })

  it('follows the package size from settings', () => {
    expect(lessonNumbers({ ...second, lesson_in_package: 7 }, 10)).toBe('lesson 7 of 10')
  })
})

describe('upcomingPosition', () => {
  it('leaves the package out for a lesson in the current one', () => {
    expect(upcomingPosition(second, 4, 4)).toBe('lesson 2 of 4')
    expect(upcomingPosition(second, 4)).toBe('lesson 2 of 4')
  })

  it('names a later package', () => {
    expect(upcomingPosition({ package_no: 3, lesson_in_package: 1, lessons: 1 }, 4, 2)).toBe(
      'Package 3, lesson 1 of 4',
    )
    expect(upcomingPosition(acrossPackages, 4, 1)).toBe(
      'last lesson of Package 2 and first of Package 3',
    )
  })
})

describe('packagePosition', () => {
  it('puts the package first, with a comma or the given separator', () => {
    expect(packagePosition(second, 4)).toBe('Package 4, lesson 2 of 4')
    expect(packagePosition(twoHours, 4, ' · ')).toBe('Package 3 · lessons 1–2 of 4')
    expect(packagePosition(acrossPackages, 4)).toBe(
      'last lesson of Package 2 and first of Package 3',
    )
  })
})

describe('formatLessonPosition (the coach’s Today list)', () => {
  const lesson = {
    status: 'booked' as const,
    used: false,
    unpaid: false,
    package_no: 4,
    lesson_in_package: 1,
    lessons: 1,
    package_size: 4,
    size: 1,
    type_label: '1-to-1',
  }

  it('reads as drawn: done, a group’s type first, an unpaid package’s first lesson', () => {
    expect(formatLessonPosition({ ...lesson, used: true, package_no: 7 })).toBe('done')
    expect(formatLessonPosition({ ...lesson, size: 2, type_label: '1-to-2' })).toBe(
      '1-to-2, lesson 1 of 4',
    )
    expect(formatLessonPosition({ ...lesson, unpaid: true, package_no: 6 })).toBe(
      'first lesson of Package 6',
    )
  })

  it('numbers other lessons, and says when one was excused', () => {
    expect(formatLessonPosition({ ...lesson, lesson_in_package: 3 })).toBe('lesson 3 of 4')
    expect(formatLessonPosition({ ...lesson, lessons: 2 })).toBe('lessons 1–2 of 4')
    expect(
      formatLessonPosition({
        ...lesson,
        status: 'excused',
        used: null,
        package_no: null,
        lesson_in_package: null,
      }),
    ).toBe('excused')
  })
})

describe('positionOf', () => {
  it('keeps only the position of a ledger row', () => {
    expect(
      positionOf({
        ...second,
        booking_id: 'd0000000-0000-4000-8000-000000000002',
        used: false,
      } as typeof second),
    ).toEqual(second)
  })
})
