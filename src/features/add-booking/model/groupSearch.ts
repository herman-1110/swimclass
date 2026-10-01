import type { Group } from '@/entities/group'

function fold(text: string): string {
  return text.toLocaleLowerCase('en')
}

/**
 * The groups Add booking offers (the Schedule spec §7.4): the active ones only, since
 * `coach_book` refuses a paused group while `coach_slot_check` would say it is free (§9 C15),
 * in the order given (by names), narrowed by the search: the students' names or the account
 * holder's name contain it, ignoring case.
 */
export function searchGroups(
  groups: readonly Group[],
  accountNames: ReadonlyMap<string, string>,
  query: string,
): Group[] {
  const wanted = fold(query.trim())
  return groups.filter(
    (group) =>
      group.active &&
      (wanted === '' ||
        fold(group.display_names).includes(wanted) ||
        fold(accountNames.get(group.account_id) ?? '').includes(wanted)),
  )
}
