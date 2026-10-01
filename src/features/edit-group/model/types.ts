import type { Group } from '@/entities/group'

/**
 * What editing a group needs from group_details: who it is (names, size for "Own account"),
 * its pool, its starting balance and whether it is active.
 */
export type EditableGroup = Pick<
  Group,
  | 'group_id'
  | 'display_names'
  | 'size'
  | 'location'
  | 'opening_used_lessons'
  | 'opening_paid_lessons'
  | 'active'
>
