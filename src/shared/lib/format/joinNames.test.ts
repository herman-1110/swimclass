import { beforeAll, describe, expect, it } from 'vitest'

import { logIn } from '@/shared/api/auth'
import { readRows, rpc } from '@/shared/api/rpc'
import { DEMO_PASSWORD } from '@/shared/config/demo'

import { joinNames } from './joinNames'

describe('joinNames', () => {
  it('joins one, two and three names like group_details', () => {
    expect(joinNames(['Hana'])).toBe('Hana')
    expect(joinNames(['Aiman', 'Sofia'])).toBe('Aiman & Sofia')
    expect(joinNames(['Adam', 'Alya', 'Amir'])).toBe('Adam, Alya & Amir')
  })

  it('uses commas up to the last name, then "&"', () => {
    expect(joinNames(['A', 'B', 'C', 'D'])).toBe('A, B, C & D')
  })

  it('keeps the order it is given', () => {
    expect(joinNames(['Sofia', 'Aiman'])).toBe('Sofia & Aiman')
  })

  it('gives an empty string for no names', () => {
    expect(joinNames([])).toBe('')
  })
})

describe('joinNames against the demo database', () => {
  beforeAll(async () => {
    // Load the demo database here (about 4 s in jsdom), not inside the test's 5 s.
    await rpc('username_available', { p_username: 'warm_up' })
  }, 60_000)

  it("matches every seeded group's display_names", async () => {
    // The coach reads every group and student (TECH_SPEC §6).
    await logIn('herman', DEMO_PASSWORD)
    const [groups, students] = await Promise.all([
      readRows('group_details', { columns: ['group_id', 'display_names', 'student_ids'] }),
      readRows('students', { columns: ['id', 'name'] }),
    ])
    const nameOf = new Map(students.map((student) => [student.id, student.name]))

    // The seed has groups of one, two and three students.
    expect(new Set(groups.map((group) => group.student_ids?.length))).toEqual(new Set([1, 2, 3]))
    for (const group of groups) {
      // student_ids come in the database's name order, so the names do too.
      const names = (group.student_ids ?? []).map((id) => nameOf.get(id) ?? '')
      expect(joinNames(names)).toBe(group.display_names)
    }
  })
})
