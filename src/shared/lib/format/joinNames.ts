/**
 * Students' names joined the way the database writes a group's names
 * (`group_details.display_names`): "Hana", "Aiman & Sofia", "Adam, Alya & Amir". It keeps
 * the order it is given; the database sorts by name first.
 */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}
