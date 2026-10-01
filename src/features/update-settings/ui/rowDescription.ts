import { cn } from '@/shared/lib/cn'

/**
 * What a setting's control lists in aria-describedby (coach-settings §7.2): its row's help,
 * and the note and the error while they show. FieldRow gives them the ids
 * `${id}-help`, `${id}-note` and `${id}-error`; Field adds its unit itself.
 */
export function rowDescription(id: string, shown: { note?: unknown; error?: unknown } = {}) {
  return cn(
    `${id}-help`,
    Boolean(shown.note) && `${id}-note`,
    Boolean(shown.error) && `${id}-error`,
  )
}
