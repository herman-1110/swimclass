import type { Group } from '@/entities/group'
import type { OwnBusyLesson } from '@/entities/schedule'
import { formatRange } from '@/shared/lib/time'

/**
 * "Already booked this day: Aiman & Sofia, 9:00–10:00 am" (DESIGN §4 item 6; book spec
 * §5.2.3): the account's own lessons that day from week_busy, named by their group (paused
 * groups too), joined with "; " when there are several. Null when there are none.
 */
export function alreadyBookedText(
  lessons: readonly Pick<OwnBusyLesson, 'group_id' | 'starts_at' | 'ends_at'>[],
  groups: readonly Pick<Group, 'group_id' | 'display_names'>[],
): string | null {
  if (lessons.length === 0) return null
  const names = new Map(groups.map((group) => [group.group_id, group.display_names]))
  const entries = lessons.map((lesson) => {
    const range = formatRange(lesson.starts_at, lesson.ends_at)
    const name = names.get(lesson.group_id)
    return name === undefined ? range : `${name}, ${range}`
  })
  return `Already booked this day: ${entries.join('; ')}`
}
