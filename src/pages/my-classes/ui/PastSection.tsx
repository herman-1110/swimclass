import type { UseQueryResult } from '@tanstack/react-query'

import type { Group } from '@/entities/group'
import type { PublicSettings } from '@/entities/settings'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'

import { PastPanel } from './PastPanel'

const PANEL_ID = 'my-classes-past'

type PastSectionProps = {
  /** The account's groups, paused ones too. */
  groups: readonly Group[]
  settings: UseQueryResult<PublicSettings>
  /** useUserId(). */
  me: string | null
  now: Date
  open: boolean
  onToggle: () => void
  /** Grid placement. */
  className?: string
}

/**
 * "Past lessons and receipts" (MyClasses.dc.html:130; my-classes C4): a button that opens
 * the past lessons and payments in place, under it. Its name stays the same either way;
 * aria-expanded says whether the panel is open.
 */
export function PastSection({
  groups,
  settings,
  me,
  now,
  open,
  onToggle,
  className,
}: PastSectionProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <Button
        variant="link"
        flush
        className="self-start"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={onToggle}
      >
        Past lessons and receipts
      </Button>
      <div id={PANEL_ID} hidden={!open} className="mt-4 flex flex-col gap-8">
        {open && <PastPanel groups={groups} settings={settings} me={me} now={now} />}
      </div>
    </div>
  )
}
