import type { FieldKey, Problems } from './types'

// The drawing's ids, kept for tests (the spec §7): add-account, add-student-{i},
// add-location, add-paid. The others follow the same pattern.
export const FIELD_IDS = {
  account: 'add-account',
  newAccount: 'add-new-account',
  newName: 'add-new-name',
  newUsername: 'add-new-username',
  newEmail: 'add-new-email',
  newPhone: 'add-new-phone',
  type: 'add-type',
  students: 'add-students',
  location: 'add-location',
  paid: 'add-paid',
  amount: 'add-amount',
  method: 'add-method',
  opening: 'add-opening',
  openingUsed: 'add-opening-used',
  openingPaid: 'add-opening-paid',
  form: 'add-form',
} as const

/** Student {index}'s input: "add-student-2". */
export function studentId(index: number): string {
  return `add-student-${index}`
}

/** The fields in page order (the spec §7): the first one with a problem takes focus. */
export function fieldOrder(size: number): FieldKey[] {
  const rows = Array.from({ length: size }, (_, i): FieldKey => `student-${i + 1}`)
  return [
    'account',
    'newName',
    'newUsername',
    'newEmail',
    'newPhone',
    'type',
    ...rows,
    'students',
    'location',
    'amount',
    'method',
    'openingUsed',
  ]
}

/** The first field with a problem, in page order; null when only the form has one. */
export function firstProblem(problems: Problems, size: number): FieldKey | null {
  return fieldOrder(size).find((key) => problems[key] !== undefined) ?? null
}

/** The problems without those of `keys` (a field the coach edits loses its message). The
 *  same object when none of them had one, so nothing re-renders for nothing. */
export function withoutProblems(problems: Problems, keys: readonly FieldKey[]): Problems {
  if (!keys.some((key) => problems[key] !== undefined)) return problems
  const rest = { ...problems }
  for (const key of keys) delete rest[key]
  return rest
}

/** A single problem at one field. */
export function problemAt(key: FieldKey, problem: Problems[FieldKey]): Problems {
  const problems: Problems = {}
  problems[key] = problem
  return problems
}

/**
 * The control that takes focus for a field, as a selector (the ids are unique on the page).
 * Lesson type's problem (`group_full`) goes to its first segment, which is there whatever
 * the fresh settings allow (the spec §5.4); Paid by is entered at its chosen radio; the
 * duplicate-group line moves focus to Student 1.
 */
export function focusSelector(key: FieldKey): string | null {
  switch (key) {
    case 'form':
      return null
    case 'type':
      return `input[name="${FIELD_IDS.type}"]`
    case 'method':
      return `input[name="${FIELD_IDS.method}"]:checked`
    case 'students':
      return `#${studentId(1)}`
    case 'account':
    case 'newName':
    case 'newUsername':
    case 'newEmail':
    case 'newPhone':
    case 'location':
    case 'amount':
    case 'openingUsed':
      return `#${FIELD_IDS[key]}`
    default:
      return `#${studentId(Number(key.slice('student-'.length)))}`
  }
}
