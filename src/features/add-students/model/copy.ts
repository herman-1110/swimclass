import { formatRinggit, plural } from '@/shared/lib/format'

// The words that change with the form (AdminAddStudents.dc.html's script, :171-182, and the
// spec §5.3). Errors are in messages.ts.

/** The type tag: "1-to-3". */
export function typeLabel(size: number): string {
  return `1-to-${size}`
}

/** Lesson type's segments, one per size up to the students per lesson (settings; the spec
 *  §2.1): 1-to-1, 1-to-2, 1-to-3. */
export function typeOptions(max: number): { value: string; label: string }[] {
  return Array.from({ length: Math.max(1, max) }, (_, i) => ({
    value: String(i + 1),
    label: typeLabel(i + 1),
  }))
}

/** The button: "Add student" for 1-to-1, otherwise "Add 3 students" (the chosen type, not the
 *  rows filled in). */
export function saveLabel(size: number): string {
  return size === 1 ? 'Add student' : `Add ${size} students`
}

/** The preview's sentence under the row. */
export function shareText(size: number): string {
  return size === 1
    ? 'Books on their own. Each lesson uses 1 lesson from this student’s package.'
    : 'They always book together, and each lesson uses 1 lesson from their shared package.'
}

/** The preview's note (drawn static), shown for 1-to-2 and 1-to-3 only (the spec C11). */
export const PREVIEW_NOTE =
  'To let one of them book alone as well, add that student again as 1-to-1. Each group keeps its own package.'

/** "One of them" makes no sense for 1-to-1 (the spec C11, Q6). */
export function showsPreviewNote(size: number): boolean {
  return size > 1
}

/**
 * The line under "First package already paid": "1-to-3 package · 4 lessons · RM 540", or
 * "… · price not set" while the coach hasn't set that type's price (the spec C6).
 */
export function packageLine(
  size: number,
  lessonsPerPackage: number,
  priceCents: number | null,
): string {
  const price = priceCents === null ? 'price not set' : formatRinggit(priceCents)
  return `${typeLabel(size)} package · ${plural(lessonsPerPackage, 'lesson')} · ${price}`
}

/** Lesson type's help, from settings (CLAUDE.md rule 9): "Up to 3 students from the same
 *  account per lesson." */
export function studentsPerLessonHelp(max: number): string {
  return `Up to ${plural(max, 'student')} from the same account per lesson.`
}

// The drawn placeholders (AdminAddStudents.dc.html:173): zulaikha's three students.
const PLACEHOLDER_NAMES = ['Adam', 'Alya', 'Amir']

/** "e.g. Adam" for Student 1, "e.g. Alya" for 2, "e.g. Amir" for 3. */
export function studentPlaceholder(index: number): string | undefined {
  const name = PLACEHOLDER_NAMES[index - 1]
  return name === undefined ? undefined : `e.g. ${name}`
}

/** Under Account once a new account exists but its group doesn't yet (the spec §5.2.2). */
export function accountCreatedNotice(name: string): string {
  return `Account created for ${name.trim()}.`
}

/** The hint under a student row (the spec §5.3). */
export const EXISTING_STUDENT = 'Existing student'
export const NEW_STUDENT = 'New student'

/** The new account's username check, as they type (the spec §6). */
export const USERNAME_CHECKING = 'Checking…'
export const USERNAME_AVAILABLE = 'Available'
