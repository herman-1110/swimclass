import { describe, expect, it } from 'vitest'

import { sortStudents } from './students'
import type { Student } from './types'

function student(idEnd: string, name: string, created_at: string): Student {
  return {
    id: `b0000000-0000-4000-8000-0000000000${idEnd}`,
    account_id: 'a0000000-0000-4000-8000-000000000003',
    name,
    active: true,
    created_at,
  }
}

// Added in this order: Zara, then two students called Ben in one call (the same instant,
// written with two offsets), then émile. The ids run the other way, and in byte order
// "Zara" would come before "émile", so no order below follows the ids or the bytes.
const zara = student('f4', 'Zara', '2026-09-20T01:00:00+00:00')
const firstBen = student('f2', 'Ben', '2026-09-20T01:00:00.25+00:00')
const secondBen = student('f3', 'Ben', '2026-09-20T09:00:00.25+08:00')
const emile = student('f1', 'émile', '2026-09-21T00:00:00.123456+00:00')
const stored = [emile, secondBen, zara, firstBen]

const ids = (students: readonly Student[]) => students.map((s) => s.id.slice(-2))

describe('sortStudents', () => {
  it('puts them in the order they were added, then by id (Add students)', () => {
    expect(ids(sortStudents(stored, 'added'))).toEqual(['f4', 'f2', 'f3', 'f1'])
  })

  it('sorts by name as people read it, then by id (My classes)', () => {
    expect(ids(sortStudents(stored, 'name'))).toEqual(['f2', 'f3', 'f1', 'f4'])
  })

  it('leaves the list it was given alone', () => {
    const before = [...stored]
    sortStudents(stored, 'added')
    sortStudents(stored, 'name')
    expect(stored).toEqual(before)
    expect(sortStudents([], 'name')).toEqual([])
  })
})
