import { Button } from '@/shared/ui/Button'
import { PageHeader } from '@/shared/ui/PageHeader'

type ScheduleHeaderProps = {
  onBlockTime: () => void
  onOpenExtraTime: () => void
  onAddBooking: () => void
}

/**
 * The page's one h1 and its three actions (design/AdminSchedule.dc.html L68-75; the Schedule
 * spec §3.1): quiet "Block time" and "Open extra time", then the primary "Add booking". On
 * phones Add booking takes the first row on its own, as drawn (CSS order, so the focus order
 * stays the drawn DOM order, §9 C13); from 768 px all three sit at the right of the title.
 */
export function ScheduleHeader({
  onBlockTime,
  onOpenExtraTime,
  onAddBooking,
}: ScheduleHeaderProps) {
  return (
    <PageHeader
      size="coach"
      title="Schedule"
      actions={
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="quiet" size="sm" aria-haspopup="dialog" onClick={onBlockTime}>
            Block time
          </Button>
          <Button variant="quiet" size="sm" aria-haspopup="dialog" onClick={onOpenExtraTime}>
            Open extra time
          </Button>
          <Button
            size="sm"
            aria-haspopup="dialog"
            className="order-first basis-full md:order-none md:ml-2 md:basis-auto"
            onClick={onAddBooking}
          >
            Add booking
          </Button>
        </div>
      }
    />
  )
}
