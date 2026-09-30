import type { Student, StudentOrder } from './types'

// Names sort as people read them, ignoring case and accents. The database sorts in byte
// order (collation C), where "Zara" comes before "émile".
const collator = new Intl.Collator('en', { sensitivity: 'base' })

type SortableStudent = Pick<Student, 'id' | 'name' | 'created_at'>

/** created_at (instants with an offset), then id: the order the database gives. */
function byAdded(a: SortableStudent, b: SortableStudent): number {
  return Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id)
}

/** By name, then id, so two students with one name always come in the same order. */
function byName(a: SortableStudent, b: SortableStudent): number {
  return collator.compare(a.name, b.name) || a.id.localeCompare(b.id)
}

/**
 * Students in the order a screen asks for (a new array):
 * - `added`: the order they were added (created_at, then id). Add students matches a typed
 *   name to the first student added with that name (its spec §5.3).
 * - `name`: alphabetical, then id (My classes, its spec R4).
 */
export function sortStudents<T extends SortableStudent>(
  students: readonly T[],
  order: StudentOrder,
): T[] {
  return students.toSorted(order === 'name' ? byName : byAdded)
}
