import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import {
  LessonRowSkeleton,
  PAST_LESSON_LIMIT,
  PastLessonRow,
  usePastLessons,
} from '@/entities/booking'
import { type Group, typeLabelIn } from '@/entities/group'
import { PAYMENT_LIMIT, PaymentRow, usePayments } from '@/entities/payment'
import type { PublicSettings } from '@/entities/settings'
import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import { type ReadFailure, useReadFailure } from '@/shared/lib/hooks/useReadFailure'
import { SectionLabel } from '@/shared/ui/SectionLabel'

import { myClassesPageWords } from '../model/words'
import { SectionError } from './SectionError'

const LESSONS_HEADING_ID = 'past-lessons-heading'
const PAYMENTS_HEADING_ID = 'payments-heading'

/** Where focus goes once "Try again" has brought a list: its heading. */
const heading = (id: string) => () => document.getElementById(id)

type PastPanelProps = {
  /** The account's groups, paused ones too: every past lesson and payment names its group. */
  groups: readonly Group[]
  /** The package size, for "Package 2, lesson 2 of 4". */
  settings: UseQueryResult<PublicSettings>
  /** useUserId(): "Cancelled by you" rather than "by your coach". */
  me: string | null
  now: Date
}

/** A list's place while its reads run, or their failure with "Try again". */
function notReady(failure: ReadFailure | null, status: string): ReactNode {
  if (failure) return <SectionError failure={failure} />
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
 * upcoming, laid out like the upcoming rows, then the account's payments. Lessons cancelled
 * before they happened are listed too, so the heading says "Past and cancelled" (triage 12). Mounted only while
 * the panel is open, so nothing is read until it opens.
 */
export function PastPanel({ groups, settings, me, now }: PastPanelProps) {
  const language = useLanguage()
  const w = wordsIn(myClassesPageWords, language)
  const groupIds = groups.map((group) => group.group_id)
  const past = usePastLessons(groupIds)
  const payments = usePayments(groupIds)
  const byId = new Map(groups.map((group) => [group.group_id, group]))
  const lessonsFailure = useReadFailure([settings, past], heading(LESSONS_HEADING_ID))
  const paymentsFailure = useReadFailure([payments], heading(PAYMENTS_HEADING_ID))

  const lessonsLoading = !lessonsFailure && (!settings.data || !past.data)
  let lessons: ReactNode
  if (lessonsFailure || !settings.data || !past.data) {
    lessons = notReady(lessonsFailure, w.loadingPast)
  } else {
    const packageSize = settings.data.lessons_per_package
    lessons = (
      <>
        {past.data.lessons.length === 0 ? (
          <p className={emptyLine}>{w.noPast}</p>
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
                    typeLabel={typeLabelIn(group, language)}
                    packageSize={packageSize}
                    myAccountId={me}
                    now={now}
                  />
                )
              )
            })}
          </ul>
        )}
        {past.data.hasMore && <p className={moreLine}>{w.showingLessons(PAST_LESSON_LIMIT)}</p>}
      </>
    )
  }

  const paymentsLoading = !paymentsFailure && !payments.data
  let receipts: ReactNode
  if (paymentsFailure || !payments.data) {
    receipts = notReady(paymentsFailure, w.loadingPayments)
  } else {
    receipts = (
      <>
        {payments.data.payments.length === 0 ? (
          <p className={emptyLine}>{w.noPayments}</p>
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
                    typeLabel={typeLabelIn(group, language)}
                  />
                )
              )
            })}
          </ul>
        )}
        {payments.data.hasMore && <p className={moreLine}>{w.showingPayments(PAYMENT_LIMIT)}</p>}
      </>
    )
  }

  return (
    <>
      <section aria-labelledby={LESSONS_HEADING_ID} aria-busy={lessonsLoading || undefined}>
        <SectionLabel as="h2" id={LESSONS_HEADING_ID} tabIndex={-1} className="mb-1">
          {w.pastHeading}
        </SectionLabel>
        {lessons}
      </section>
      <section aria-labelledby={PAYMENTS_HEADING_ID} aria-busy={paymentsLoading || undefined}>
        <SectionLabel as="h2" id={PAYMENTS_HEADING_ID} tabIndex={-1} className="mb-1">
          {w.payments}
        </SectionLabel>
        {receipts}
      </section>
    </>
  )
}
