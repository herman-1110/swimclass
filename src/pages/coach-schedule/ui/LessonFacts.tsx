import { useRef } from 'react'

import { PackageSummary, PackageSummarySkeleton, useCoachBalance } from '@/entities/balance'
import { packagePosition } from '@/entities/booking'
import { accountLabel } from '@/entities/group'
import type { BookedCoachLesson } from '@/entities/schedule'
import { cn } from '@/shared/lib/cn'
import { Tag } from '@/shared/ui/Tag'

import { LoadError } from './LoadError'

type LessonFactsProps = {
  lesson: BookedCoachLesson
}

const row = 'flex flex-col gap-1'
const term = 'text-label font-medium text-muted'
const value = 'm-0 text-sm leading-[1.45]'

/**
 * The lesson in its details (the Schedule spec §7.4): "Group" (type tag and whose account),
 * "Location", "Lesson" (its place in the package, "Package 4 · lesson 2 of 4", with "· done"
 * once over, and its flags: "Last paid lesson", "Gap override", the Unpaid pill) and
 * "Package": the group's package now, as on Book (DESIGN §3).
 */
export function LessonFacts({ lesson }: LessonFactsProps) {
  const balance = useCoachBalance(lesson.group_id)
  const summary = useRef<HTMLElement>(null)
  const position = packagePosition(
    {
      package_no: lesson.package_no,
      lesson_in_package: lesson.lesson_in_package,
      lessons: lesson.lessons,
    },
    lesson.package_size,
    ' · ',
  )
  // No Unpaid pill: paying is the group's status, in its Package row below and on Students &
  // payments, not each lesson's (Herman, 2 Oct 2026).
  const flagged = lesson.last_lesson || lesson.gap_override

  return (
    <dl className="m-0 flex flex-col gap-3.5">
      <div className={row}>
        <dt className={term}>Group</dt>
        <dd className={cn(value, 'flex flex-wrap items-center gap-2 wrap-anywhere')}>
          <Tag>{lesson.type_label}</Tag> {accountLabel(lesson, lesson.account_name)}
        </dd>
      </div>
      <div className={row}>
        <dt className={term}>Location</dt>
        <dd className={cn(value, 'break-words')}>{lesson.location}</dd>
      </div>
      <div className={row}>
        <dt className={term}>Lesson</dt>
        <dd className={value}>{lesson.used ? `${position} · done` : position}</dd>
        {flagged && (
          <dd className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1">
            {lesson.last_lesson && (
              <span className="text-label font-semibold text-warn">Last paid lesson</span>
            )}
            {lesson.gap_override && <span className="text-label text-muted">Gap override</span>}
          </dd>
        )}
      </div>
      <div className={row}>
        <dt className={term}>Package</dt>
        {/* Focusable, so "Try again" can hand focus to the package that takes its place. */}
        <dd ref={summary} tabIndex={-1} className="m-0" aria-busy={balance.isPending || undefined}>
          {balance.data ? (
            <PackageSummary balance={balance.data} typeLabel={lesson.type_label} />
          ) : balance.isError ? (
            <LoadError
              error={balance.error}
              onRetry={() => void balance.refetch()}
              focusAfter={summary}
            />
          ) : balance.isPending ? (
            <PackageSummarySkeleton />
          ) : null}
        </dd>
      </div>
    </dl>
  )
}
