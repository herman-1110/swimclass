import type { Row } from '@/shared/api/rpc'

type GroupDetailsRow = Row<'group_details'>

/** How many students book together: 1-to-1, 1-to-2 or 1-to-3 (CLAUDE.md rule 5). */
export type GroupSize = 1 | 2 | 3

/** The type tag the screens show: `'1-to-' || size`. */
export type TypeLabel = '1-to-1' | '1-to-2' | '1-to-3'

/**
 * A student group as `group_details` shows it (TECH_SPEC §4; data-contracts §3.6): who
 * books together, their type, the pool, the starting balance and the students' ids.
 * `display_names` is "Aiman & Sofia" or "Adam, Alya & Amir" (sorted by name, as
 * `joinNames` writes them) and `student_ids` follows the same order.
 *
 * The generated view type makes every column nullable (PostgREST can't see NOT NULL
 * through a view). None is ever null, since a group always has a member, so they are
 * narrowed here (data-contracts §6.2), with `size` and `type_label` to their real values.
 */
export type Group = {
  [K in Exclude<keyof GroupDetailsRow, 'size' | 'type_label'>]-?: NonNullable<GroupDetailsRow[K]>
} & {
  size: GroupSize
  type_label: TypeLabel
}
