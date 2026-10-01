import type { UseQueryResult } from '@tanstack/react-query'
import { type ReactNode, useEffect, useRef } from 'react'

import type { GroupBalance } from '@/entities/balance'
import { LessonRowSkeleton, notEnded, type UpcomingLesson } from '@/entities/booking'
import type { Group } from '@/entities/group'
import type { PublicSettings } from '@/entities/settings'
import { ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { Banner } from '@/shared/ui/Banner'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { EmptyState } from '@/shared/ui/EmptyState'
import { SectionLabel } from '@/shared/ui/SectionLabel'

import { SectionError } from './SectionError'
import { UpcomingLessonRow } from './UpcomingLessonRow'

type UpcomingSectionProps = {
  upcoming: UseQueryResult<UpcomingLesson[]>
  /** The account's groups, paused ones too: each row's names and type. */
  groups: UseQueryResult<Group[]>
  /** The groups' balances: a lesson in a later package names it. Rows show without it if it
   *  fails (Packages shows that error). */
  balances: UseQueryResult<GroupBalance[]>
  /** The cutoff and the package size. */
  settings: UseQueryResult<PublicSettings>
  now: Date
  /** "Lesson cancelled: …", shown and focused under the heading until the page is left. */
  notice: string | null
  onCancelled: (notice: string) => void
  /** Grid placement. */
  className?: string
}

/**
 * Upcoming (MyClasses.dc.html:56-91): the account's lessons that haven't ended, soonest
 * first, each with Cancel or Locked. Rows that end while the page is open go at once (they
 * count as used, and Past shows them after the next refresh).
 */
export function UpcomingSection({
  upcoming,
  groups,
  balances,
  settings,
  now,
  notice,
  onCancelled,
  className,
}: UpcomingSectionProps) {
  const noticeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (notice) noticeRef.current?.focus()
  }, [notice])

  const failed = [settings, groups, upcoming].filter((query) => query.isError)
  // The balances only name a later package: the rows wait for them, but not for a failure.
  const ready =
    settings.data && groups.data && upcoming.data && !balances.isPending
      ? { settings: settings.data, groups: groups.data, lessons: upcoming.data }
      : null
  const loading = failed.length === 0 && !ready

  let body: ReactNode
  if (failed.length > 0) {
    body = (
      <SectionError
        error={failed[0].error}
        retrying={failed.some((query) => query.isFetching)}
        onRetry={() => failed.forEach((query) => void query.refetch())}
      />
    )
  } else if (!ready) {
    body = (
      <>
        <p role="status" className="sr-only">
          Loading your lessons…
        </p>
        <LessonRowSkeleton />
        <LessonRowSkeleton />
      </>
    )
  } else {
    const groupsById = new Map(ready.groups.map((group) => [group.group_id, group]))
    const packageNos = new Map(balances.data?.map((b) => [b.group_id, b.package_no]))
    const lessons = notEnded(ready.lessons, now)
    const { lessons_per_package: packageSize, cancel_cutoff_hours: cutoffHours } = ready.settings
    body =
      lessons.length === 0 ? (
        <div className="py-4">
          <EmptyState
            action={
              <ButtonLink to={ROUTES.book} variant="link" flush>
                Book a lesson
              </ButtonLink>
            }
          >
            No upcoming lessons.
          </EmptyState>
        </div>
      ) : (
        <ul role="list">
          {lessons.map((lesson) => {
            const group = groupsById.get(lesson.group_id)
            return (
              group && (
                <UpcomingLessonRow
                  key={lesson.id}
                  lesson={lesson}
                  group={group}
                  currentPackageNo={packageNos.get(lesson.group_id) ?? null}
                  packageSize={packageSize}
                  cutoffHours={cutoffHours}
                  now={now}
                  onCancelled={onCancelled}
                />
              )
            )
          })}
        </ul>
      )
  }

  return (
    <section
      aria-labelledby="upcoming-heading"
      aria-busy={loading || undefined}
      className={cn('flex flex-col', className)}
    >
      <SectionLabel as="h2" id="upcoming-heading" className="mb-1">
        Upcoming
      </SectionLabel>
      {notice && (
        <Banner ref={noticeRef} role="status" tabIndex={-1} className="mt-2">
          {notice}
        </Banner>
      )}
      {body}
    </section>
  )
}
