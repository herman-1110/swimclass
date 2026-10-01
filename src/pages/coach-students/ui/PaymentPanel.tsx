import type { Ref } from 'react'

import { accountLabel } from '@/entities/group'
import type { PublicSettings } from '@/entities/settings'
import type { Instant } from '@/shared/lib/time'
import { SidePanel } from '@/shared/ui/SidePanel'

import type { PackageRow } from '../model/rows'
import { LoadError } from './LoadError'
import { PanelSkeleton } from './PanelSkeleton'
import { PaymentPanelContent } from './PaymentPanelContent'

type PaymentPanelProps = {
  /** The group in the panel, or null when there is none to show. */
  row: PackageRow | null
  /** The list is still loading. */
  loading: boolean
  /** get_public_settings: the prices that prefill the amount. */
  settings: { data?: PublicSettings; isError: boolean; error: unknown; refetch: () => unknown }
  /** Below 1280 px the panel shows only while open; from 1280 px it is always there. */
  open: boolean
  /** From 1280 px Cancel only resets the form. */
  wide: boolean
  now: Instant
  onClose: () => void
  /** The coach worked on the group shown (from 1280 px it then stays in the panel). */
  onEngage: (groupId: string) => void
  titleRef?: Ref<HTMLHeadingElement>
}

/**
 * The Record payment panel (DESIGN §3 SidePanel; coach-students §2, §3.8): a 340 px column
 * from 1280 px, a 380 px drawer from 768 px and the full screen on phones.
 */
export function PaymentPanel(props: PaymentPanelProps) {
  const { row, loading, settings, open, wide, now, onClose, onEngage, titleRef } = props
  const subtitle = row
    ? `${row.group.display_names} · ${accountLabel(row.group, row.accountName)}`
    : undefined

  const content = () => {
    if (loading) return <PanelSkeleton />
    if (!row) {
      return (
        <p className="text-sm leading-normal text-muted">
          Choose Record payment on a row to start.
        </p>
      )
    }
    if (settings.isError) {
      return <LoadError error={settings.error} onRetry={() => void settings.refetch()} />
    }
    if (!settings.data) return <PanelSkeleton />
    return (
      <PaymentPanelContent
        key={row.group.group_id}
        row={row}
        settings={settings.data}
        now={now}
        onCancel={wide ? undefined : onClose}
        onEngage={() => onEngage(row.group.group_id)}
      />
    )
  }

  return (
    <SidePanel
      title="Record payment"
      subtitle={subtitle}
      open={open}
      onClose={onClose}
      titleRef={titleRef}
    >
      {content()}
    </SidePanel>
  )
}
