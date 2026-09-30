import type { Group } from './types'

// Names as people read them: ignoring case and accents. The database's collation is C,
// where "adam" would sort after "Zara" (coach-add-students §5.1).
const collator = new Intl.Collator('en', { sensitivity: 'base' })

function compareText(a: string, b: string): number {
  return collator.compare(a, b)
}

/**
 * Orders groups by their names ("Adam, Alya & Amir" before "Aiman & Sofia"), then by id,
 * so two groups with the same names never swap places between loads.
 */
export function byNames(
  a: Pick<Group, 'display_names' | 'group_id'>,
  b: Pick<Group, 'display_names' | 'group_id'>,
): number {
  const byName = compareText(a.display_names, b.display_names)
  if (byName !== 0) return byName
  return a.group_id < b.group_id ? -1 : a.group_id > b.group_id ? 1 : 0
}

/**
 * The pool locations the groups use, each once, in reading order: suggestions for Add
 * students' Pool location (coach-add-students §5.1). The same text is one location;
 * nothing is merged that the coach typed differently.
 */
export function distinctLocations(groups: readonly Pick<Group, 'location'>[]): string[] {
  return [...new Set(groups.map((group) => group.location))].sort(compareText)
}
