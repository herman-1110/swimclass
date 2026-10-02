import { describe, expect, it } from 'vitest'

import { coachStudentsAdded, coachStudentsHistory, coachStudentsPay } from './routes'

const HANA = 'c0000000-0000-4000-8000-000000000003'

describe('coachStudentsPay', () => {
  it('opens Students & payments with the group’s Record payment panel', () => {
    expect(coachStudentsPay(HANA)).toBe(`/coach/students?pay=${HANA}`)
  })
})

describe('coachStudentsHistory', () => {
  it('opens Students & payments with the group’s History', () => {
    expect(coachStudentsHistory(HANA)).toBe(`/coach/students?history=${HANA}`)
  })
})

describe('coachStudentsAdded', () => {
  it('opens Students & payments with the group just added highlighted', () => {
    expect(coachStudentsAdded(HANA)).toBe(`/coach/students?added=${HANA}`)
  })
})
