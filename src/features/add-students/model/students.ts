import type { Student } from '@/entities/account'
import { joinNames } from '@/shared/lib/format'

import { EXISTING_STUDENT, NEW_STUDENT } from './copy'
import type { StudentItem } from './types'

/** An account's student as the rows match it: active, in the order they were added. */
export type KnownStudent = Pick<Student, 'id' | 'name'>

/** One visible student row after matching (`index` counts from 1, like "Student 1"). */
export type ResolvedRow =
  | { kind: 'empty'; index: number }
  | { kind: 'existing'; index: number; student: KnownStudent }
  | { kind: 'new'; index: number; name: string }

/**
 * A name as the rows compare it: trimmed, runs of spaces collapsed, case ignored
 * ("  sofia  " and "Sofia" are the same student; the spec §5.3).
 */
export function nameKey(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Each visible row matched to the account's students (prompt 09: a typed name that matches
 * an existing student is that student, because create_group makes a new student for every
 * name it is sent). `students` come in the order they were added, so when two share a name
 * the first added wins. A blank row is empty; anything else unmatched is a new student.
 */
export function resolveStudents(
  rows: readonly string[],
  students: readonly KnownStudent[],
): ResolvedRow[] {
  const byKey = new Map<string, KnownStudent>()
  for (const student of students) {
    const key = nameKey(student.name)
    if (!byKey.has(key)) byKey.set(key, student)
  }
  return rows.map((text, i): ResolvedRow => {
    const index = i + 1
    const key = nameKey(text)
    if (key === '') return { kind: 'empty', index }
    const student = byKey.get(key)
    return student
      ? { kind: 'existing', index, student }
      : { kind: 'new', index, name: text.trim() }
  })
}

/**
 * The hint under a row: "Existing student" or "New student", or nothing for a blank row.
 * Hints show only while the account has students (the spec §5.3); otherwise every name is
 * new and saying so adds nothing.
 */
export function studentHint(row: ResolvedRow, accountHasStudents: boolean): string | null {
  if (!accountHasStudents || row.kind === 'empty') return null
  return row.kind === 'existing' ? EXISTING_STUDENT : NEW_STUDENT
}

/**
 * create_group's `p_students`, in row order, so a refusal's `{index}` is the row's number.
 * Only call it once every row is filled (the form checks that first): a blank row would go
 * as an empty name, which the database refuses as `invalid_name`.
 */
export function studentItems(rows: readonly ResolvedRow[]): StudentItem[] {
  return rows.map((row) => {
    if (row.kind === 'existing') return { student_id: row.student.id }
    return { name: row.kind === 'new' ? row.name : '' }
  })
}

// group_details sorts the names with the database's collation, which is C in the demo
// (byte order: capitals first; the spec §5.1, C12). Comparing UTF-16 code units gives the
// same order for every name a coach types.
function byteOrder(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * The names the customer will see: the filled rows as the database will write them (an
 * existing student in their stored spelling, sorted like `group_details`), then "Student {i}"
 * for each blank row in row order, joined like the database ("Hadi & Hana",
 * "Student 1, Student 2 & Student 3").
 */
export function previewNames(rows: readonly ResolvedRow[]): string {
  const names = rows
    .flatMap((row) =>
      row.kind === 'existing' ? [row.student.name] : row.kind === 'new' ? [row.name] : [],
    )
    .sort(byteOrder)
  const blanks = rows.filter((row) => row.kind === 'empty').map((row) => `Student ${row.index}`)
  return joinNames([...names, ...blanks])
}
