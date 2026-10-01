import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import {
  LessonRowSkeleton,
  PAST_LESSON_LIMIT,
  PastLessonRow,
  usePastLessons,
} from '@/entities/booking'
import type { Group } from '@/entities/group'
import { PAYMENT_LIMIT, PaymentRow, usePayments } from '@/entities/payment'
import type { PublicSettings } from '@/entities/settings'
import { SectionLabel } from '@/shared/ui/SectionLabel'

import { SectionError } from './SectionError'

type PastPanelProps = {
  /** The account's groups, paused ones too: every past lesson and payment names its group. */
  groups: readonly Group[]
  /** The package size, for "Package 2, lesson 2 of 4". */
  settings: UseQueryResult<PublicSettings>
  /** useUserId(): "Cancelled by you" rather than "by your coach". */
  me: string | null
  now: Date
}

/** A list's place while its reads run, or the first failure with "Try again". */
function notReady(failed: readonly UseQueryResult[], status: string): ReactNode {
  if (failed.length > 0) {
    return (
      <SectionError
        error={failed[0].error}
        retrying={failed.some((query) => query.isFetching)}
        onRetry={() => failed.forEach((query) => void query.refetch())}
      />
    )
  }
  return (
    <>
      <p role="status" className="sr-only">
        {status}
      </p>
      <LessonRowSkeleton />
      <LessonRowSkeleton />
    </>
  )
}

const emptyLine = 'py-4 text-sm leading-normal text-muted'
const moreLine = 'pt-3 text-small leading-normal text-muted'

/**
 * Past lessons and receipts (my-classes §2.7, not drawn): the latest lessons that aren't
 * upcoming, laid out like the upcoming rows, then the account's payments. Mounted only while
 * the panel is open, so nothing is read until it opens.
 */
export function PastPanel({ groups, settings, me, now }: PastPanelProps) {
  const groupIds = groups.map((group) => group.group_id)
  const past = usePastLessons(groupIds)
  const payments = usePayments(groupIds)
  const byId = new Map(groups.map((group) => [group.group_id, group]))

  const lessonsFailed = [settings, past].filter((query) => query.isError)
  const lessonsLoading = lessonsFailed.length === 0 && (!settings.data || !past.data)
  let lessons: ReactNode
  if (lessonsFailed.length > 0 || !settings.data || !past.data) {
    lessons = notReady(lessonsFailed, 'Loading your past lessons…')
  } else {
    const packageSize = settings.data.lessons_per_package
    lessons = (
      <>
        {past.data.lessons.length === 0 ? (
          <p className={emptyLine}>No past lessons yet.</p>
        ) : (
          <ul role="list">
            {past.data.lessons.map((lesson) => {
              const group = byId.get(lesson.group_id)
              return (
                group && (
                  <PastLessonRow
                    key={lesson.id}
                    lesson={lesson}
                    names={group.display_names}
                    typeLabel={group.type_label}
                    packageSize={packageSize}
                    myAccountId={me}
                    now={now}
                  />
                )
              )
            })}
          </ul>
        )}
        {past.data.hasMore && (
          <p className={moreLine}>{`Showing your last ${PAST_LESSON_LIMIT} lessons.`}</p>
        )}
      </>
    )
  }

  let receipts: ReactNode
  if (payments.isError || !payments.data) {
    receipts = notReady(payments.isError ? [payments] : [], 'Loading your payments…')
  } else {
    receipts = (
      <>
        {payments.data.payments.length === 0 ? (
          <p className={emptyLine}>No payments yet.</p>
        ) : (
          <ul role="list">
            {payments.data.payments.map((payment) => {
              const group = byId.get(payment.group_id)
              return (
                group && (
                  <PaymentRow
                    key={payment.id}
                    variant="account"
                    payment={payment}
                    names={group.display_names}
                    typeLabel={group.type_label}
                  />
                )
              )
            })}
          </ul>
        )}
        {payments.data.hasMore && (
          <p className={moreLine}>{`Showing your last ${PAYMENT_LIMIT} payments.`}</p>
        )}
      </>
    )
  }

  return (
    <>
      <section aria-labelledby="past-lessons-heading" aria-busy={lessonsLoading || undefined}>
        <SectionLabel as="h2" id="past-lessons-heading" className="mb-1">
          Past lessons
        </SectionLabel>
        {lessons}
      </section>
      <section aria-labelledby="payments-heading" aria-busy={payments.isPending || undefined}>
        <SectionLabel as="h2" id="payments-heading" className="mb-1">
          Payments
        </SectionLabel>
        {receipts}
      </section>
    </>
  )
}
