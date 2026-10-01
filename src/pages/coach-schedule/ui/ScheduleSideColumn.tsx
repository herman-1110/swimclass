import { MessageAllCustomers } from '@/features/post-announcement'
import type { DateKey } from '@/shared/lib/time'

import { NeedsAttention } from './NeedsAttention'
import { TodayPanel } from './TodayPanel'

type ScheduleSideColumnProps = {
  today: DateKey
  /** Show a notice after a change here; `focus` when what was pressed is gone. */
  onNotice: (notice: string, options?: { focus?: boolean }) => void
}

/**
 * The side column (design/AdminSchedule.dc.html L33, L42-43, L48, L203-241; the Schedule
 * spec §2): Today, Needs attention and Message all customers. On phones a column under the
 * week with a top border; from 768 px a two-column grid with the message across both; from
 * 1280 px a 320 px column at the right edge, full height, with a left border. It is the
 * page's second aside (the sidebar is the first), so it has its own name.
 */
export function ScheduleSideColumn({ today, onNotice }: ScheduleSideColumnProps) {
  return (
    <aside
      aria-label="Today and messages"
      className="flex flex-col gap-8 border-t border-line px-5 pt-6 pb-8 md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-8 md:p-8 xl:flex xl:w-80 xl:shrink-0 xl:gap-9 xl:border-t-0 xl:border-l xl:px-6 xl:py-8"
    >
      <TodayPanel today={today} />
      <NeedsAttention onApproved={(notice) => onNotice(notice, { focus: true })} />
      <MessageAllCustomers
        className="md:col-span-2 xl:col-span-1"
        onSent={(notice) => onNotice(notice)}
        onRemoved={(notice) => onNotice(notice, { focus: true })}
      />
    </aside>
  )
}
