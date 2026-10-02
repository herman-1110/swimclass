import { useEffect, useRef } from 'react'

import { BalanceStatus, PackageProgress } from '@/entities/balance'
import { accountLabel } from '@/entities/group'
import type { Instant } from '@/shared/lib/time'
import { Button } from '@/shared/ui/Button'
import { SidePanel } from '@/shared/ui/SidePanel'
import { Tag } from '@/shared/ui/Tag'

import type { PackageRow } from '../model/rows'
import { HistoryGroup } from './HistoryGroup'
import { HistoryLessons } from './HistoryLessons'
import { HistoryPayments } from './HistoryPayments'

type HistoryDrawerProps = {
  /** The group shown, or null (closed). */
  row: PackageRow | null
  onClose: () => void
  /** "Record payment": the payment panel for this group (paying ahead, coach-students C7). */
  onRecordPayment: (groupId: string) => void
  now: Instant
}

/**
 * A group's History (coach-students §3.9, proposed; prompt 09): a drawer at every width (380 px
 * from 768 px, over the 1280 px payment column; the full screen on phones). The package with
 * its status and "Record payment", then Payments, Lessons and the Group actions.
 */
export function HistoryDrawer({ row, onClose, onRecordPayment, now }: HistoryDrawerProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const groupId = row?.group.group_id ?? null
  // "that group" (a refused reactivation) shows another group in the open drawer, and the
  // link goes with the old group's content: the title takes focus, as when the drawer opens.
  const shownGroup = useRef(groupId)
  useEffect(() => {
    const before = shownGroup.current
    shownGroup.current = groupId
    if (before !== null && groupId !== null && before !== groupId) titleRef.current?.focus()
  }, [groupId])

  const subtitle = row
    ? `${row.group.display_names} · ${accountLabel(row.group, row.accountName)}`
    : undefined
  return (
    <SidePanel
      alwaysModal
      title="History"
      subtitle={subtitle}
      open={row !== null}
      onClose={onClose}
      titleRef={titleRef}
    >
      {row && (
        <div key={row.group.group_id} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-muted">
              <Tag>{row.group.type_label}</Tag>
              <span className="min-w-0 wrap-anywhere">
                {row.group.active ? row.group.location : `${row.group.location} · Inactive`}
              </span>
            </p>
            <PackageProgress balance={row.balance} variant="card" />
            <BalanceStatus balance={row.balance} now={now} />
            <Button
              size="compact"
              className="self-start"
              onClick={() => onRecordPayment(row.group.group_id)}
            >
              <span>
                Record payment <span className="sr-only">for {row.group.display_names}</span>
              </span>
            </Button>
          </div>
          <HistoryPayments group={row.group} now={now} />
          <HistoryLessons group={row.group} packageSize={row.balance.package_size} now={now} />
          <HistoryGroup row={row} />
        </div>
      )}
    </SidePanel>
  )
}
