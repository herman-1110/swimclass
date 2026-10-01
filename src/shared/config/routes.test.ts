import { describe, expect, it } from 'vitest'

import { coachStudentsPay } from './routes'

describe('coachStudentsPay', () => {
  it('opens Students & payments with the group’s Record payment panel', () => {
    expect(coachStudentsPay('c0000000-0000-4000-8000-000000000003')).toBe(
      '/coach/students?pay=c0000000-0000-4000-8000-000000000003',
    )
  })
})
