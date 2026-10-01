import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'

import { cancelPolicyNote, PICK_A_TIME } from '../model/summary'
import { SummaryFrame } from './SummaryFrame'
import { SummaryText } from './SummaryText'

type BookingSummaryPlaceholderProps = {
  /** settings' cancel_cutoff_hours for the note, or null while the settings load. */
  cutoffHours: number | null
  /** Layout only: the page's grid area. */
  className?: string
}

/**
 * The booking summary while the screen loads (book spec §6.1): in its place and its size,
 * showing state A ("Pick a start time", "Pick a time" unavailable), so nothing moves when
 * the real one takes over.
 */
export function BookingSummaryPlaceholder({
  cutoffHours,
  className,
}: BookingSummaryPlaceholderProps) {
  return (
    <SummaryFrame className={className}>
      <div className="flex flex-col gap-0.5">
        <SummaryText state={PICK_A_TIME} />
      </div>
      <Button size="xl" block aria-disabled>
        {PICK_A_TIME.buttonLabel}
      </Button>
      {cutoffHours === null ? (
        <Skeleton shape="line" className="mx-auto h-3.5 w-60 max-w-full" />
      ) : (
        <p className="text-center text-small text-muted">{cancelPolicyNote(cutoffHours)}</p>
      )}
    </SummaryFrame>
  )
}
