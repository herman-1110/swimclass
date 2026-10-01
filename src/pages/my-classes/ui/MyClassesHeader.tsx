import type { ReactNode } from 'react'

import type { Student } from '@/entities/account'
import { CoachBanner } from '@/entities/announcement'
import type { Group } from '@/entities/group'
import { cn } from '@/shared/lib/cn'
import { joinNames, possessive } from '@/shared/lib/format'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Skeleton } from '@/shared/ui/Skeleton'

type MyClassesHeaderProps = {
  /** The account holder's name (profiles.display_name): undefined while it loads, null if it
   *  couldn't be read (the line is left out). */
  displayName: string | null | undefined
  /** The account's groups, paused ones too; undefined while they load. */
  groups: readonly Group[] | undefined
  /** The account's active students, in name order; undefined while they load. */
  students: readonly Student[] | undefined
  /** The coach's pinned message, or null for none (not drawn: prompt 07 TASK 4). */
  announcement: string | null
  /** Grid placement. */
  className?: string
}

/**
 * "Mei Ling’s account · Aiman & Sofia" (MyClasses.dc.html:53; my-classes Q12): the students
 * of the account's active groups, each once, in name order, joined as the database joins a
 * group's names. Just "Herman’s account" when there are none.
 */
function accountSubtitle(name: string, groups: readonly Group[], students: readonly Student[]) {
  const inActiveGroups = new Set(groups.filter((g) => g.active).flatMap((g) => g.student_ids))
  const names = students.filter((s) => inActiveGroups.has(s.id)).map((s) => s.name)
  const account = `${possessive(name)} account`
  return names.length > 0 ? `${account} · ${joinNames(names)}` : account
}

/**
 * The page's head (MyClasses.dc.html:52-55): whose account and which students over the h1,
 * then the coach's pinned message, 24 px under the h1, when there is one (my-classes C3).
 */
export function MyClassesHeader({
  displayName,
  groups,
  students,
  announcement,
  className,
}: MyClassesHeaderProps) {
  let subtitle: ReactNode = null
  if (displayName === undefined || !groups || !students) {
    // 16 × 180 px while the name and the students load (my-classes §6).
    subtitle = <Skeleton shape="line" className="h-4 w-45 max-w-full" />
  } else if (displayName !== null) {
    subtitle = accountSubtitle(displayName, groups, students)
  }
  return (
    <div className={cn('flex flex-col', className)}>
      <PageHeader size="customer" title="My classes" eyebrow={subtitle} />
      {announcement && <CoachBanner message={announcement} className="mt-6" />}
    </div>
  )
}
