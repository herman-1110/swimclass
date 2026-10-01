import { describe, expect, it } from 'vitest'

import {
  type KnownStudent,
  nameKey,
  previewNames,
  resolveStudents,
  studentHint,
  studentItems,
} from './students'

// zulaikha's and farah's students in the seed (supabase/seed.sql), in the order added.
const adam: KnownStudent = { id: 'b0000000-0000-4000-8000-000000000006', name: 'Adam' }
const alya: KnownStudent = { id: 'b0000000-0000-4000-8000-000000000007', name: 'Alya' }
const amir: KnownStudent = { id: 'b0000000-0000-4000-8000-000000000008', name: 'Amir' }
const hana: KnownStudent = { id: 'b0000000-0000-4000-8000-000000000003', name: 'Hana' }

describe('nameKey', () => {
  it('ignores case, outer spaces and runs of spaces', () => {
    expect(nameKey('  sofia ')).toBe('sofia')
    expect(nameKey('Jun   Hao')).toBe('jun hao')
    expect(nameKey('   ')).toBe('')
  })
})

describe('resolveStudents', () => {
  it('matches a typed name to the account’s student, in any case and spacing', () => {
    expect(resolveStudents(['adam', ' Alya ', 'AMIR'], [adam, alya, amir])).toEqual([
      { kind: 'existing', index: 1, student: adam },
      { kind: 'existing', index: 2, student: alya },
      { kind: 'existing', index: 3, student: amir },
    ])
  })

  it('treats any other name as a new student, trimmed, and a blank row as empty', () => {
    expect(resolveStudents([' Hakim ', '', 'Hana'], [hana])).toEqual([
      { kind: 'new', index: 1, name: 'Hakim' },
      { kind: 'empty', index: 2 },
      { kind: 'existing', index: 3, student: hana },
    ])
  })

  it('picks the student added first when two share a name', () => {
    const second: KnownStudent = { id: 'b9', name: 'adam' }
    expect(resolveStudents(['Adam'], [adam, second])).toEqual([
      { kind: 'existing', index: 1, student: adam },
    ])
  })

  it('matches nothing for an account with no students', () => {
    expect(resolveStudents(['Adam'], [])).toEqual([{ kind: 'new', index: 1, name: 'Adam' }])
  })
})

describe('studentHint', () => {
  it('says whether a filled row is an existing or a new student', () => {
    const [existing, typed, blank] = resolveStudents(['Hana', 'Hadi', ''], [hana])
    expect(studentHint(existing, true)).toBe('Existing student')
    expect(studentHint(typed, true)).toBe('New student')
    expect(studentHint(blank, true)).toBeNull()
  })

  it('says nothing while the account has no students', () => {
    const [typed] = resolveStudents(['Hadi'], [])
    expect(studentHint(typed, false)).toBeNull()
  })
})

describe('studentItems', () => {
  it('sends existing students by id and new ones by name, in row order', () => {
    expect(studentItems(resolveStudents(['Hadi', 'hana'], [hana]))).toEqual([
      { name: 'Hadi' },
      { student_id: hana.id },
    ])
  })
})

describe('previewNames', () => {
  it('sorts the names like group_details and uses the stored spelling (the spec §5.3)', () => {
    expect(previewNames(resolveStudents(['hana', 'Hadi'], [hana]))).toBe('Hadi & Hana')
    expect(previewNames(resolveStudents(['amir', 'Adam', 'alya'], [adam, alya, amir]))).toBe(
      'Adam, Alya & Amir',
    )
  })

  it('sorts in byte order, as the demo database does (capitals first, C12)', () => {
    expect(previewNames(resolveStudents(['zara', 'Adam', 'ben'], []))).toBe('Adam, ben & zara')
  })

  it('names blank rows "Student {i}" after the filled ones', () => {
    expect(previewNames(resolveStudents(['', '', ''], []))).toBe('Student 1, Student 2 & Student 3')
    expect(previewNames(resolveStudents(['', 'Zara'], []))).toBe('Zara & Student 1')
    expect(previewNames(resolveStudents([''], []))).toBe('Student 1')
  })
})
