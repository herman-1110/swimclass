import { useExcusableLessons } from '@/entities/booking'
import type { PublicSettings } from '@/entities/settings'
import { ExcuseMissedLesson } from '@/features/excuse-lesson'
import { AddFreeLesson, RecordPaymentForm } from '@/features/record-payment'
import { type Instant, mytDateKey } from '@/shared/lib/time'
import { SectionLabel } from '@/shared/ui/SectionLabel'

import { toExcuseOption } from '../model/excuseOptions'
import type { PackageRow } from '../model/rows'

type PaymentPanelContentProps = {
  row: PackageRow
  settings: PublicSettings
  now: Instant
  /** Cancel: below 1280 px it closes the panel; from 1280 px the form only resets. */
  onCancel?: () => void
  /** The coach worked on this group (typed, saved, added, excused). */
  onEngage: () => void
}

/**
 * What the Record payment panel holds for one group (AdminStudents.dc.html:277-316): the
 * payment form, "Other adjustments" (a free lesson, excusing a missed one) and the note about
 * online payments. Key it by the group, so another group starts afresh.
 */
export function PaymentPanelContent({
  row,
  settings,
  now,
  onCancel,
  onEngage,
}: PaymentPanelContentProps) {
  const { group, balance } = row
  const excusable = useExcusableLessons(group.group_id, now)
  const lessons = {
    data: excusable.data?.map(toExcuseOption),
    isPending: excusable.isPending,
    isError: excusable.isError,
    error: excusable.error,
    refetch: excusable.refetch,
  }

  return (
    // `contents`: the pieces stay 18 px apart in the panel's column. Typing anywhere in it
    // counts as working on this group.
    <div className="contents" onChange={onEngage}>
      <RecordPaymentForm
        group={group}
        balance={balance}
        settings={settings}
        accountName={row.accountName}
        today={mytDateKey(now)}
        onCancel={onCancel}
        onSaved={onEngage}
      />
      <div className="flex flex-col items-start border-t border-line pt-3.5">
        <SectionLabel as="h3" className="mb-0.5">
          Other adjustments
        </SectionLabel>
        <AddFreeLesson groupId={group.group_id} names={group.display_names} onAdded={onEngage} />
        <ExcuseMissedLesson
          lessons={lessons}
          packageSize={balance.package_size}
          onExcused={onEngage}
        />
      </div>
      <p className="text-small leading-normal text-muted">
        Online payments (FPX, DuitNow) record themselves once a payment gateway is connected.
      </p>
    </div>
  )
}
