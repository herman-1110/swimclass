import { cn } from '@/shared/lib/cn'

import { IconButton } from './IconButton'
import { ChevronLeftIcon } from './icons/ChevronLeftIcon'
import { ChevronRightIcon } from './icons/ChevronRightIcon'

// The week label's three looks.
const labelLooks = {
  // Customer Schedule (design/Schedule.dc.html): 15 px 600.
  stretch: 'text-body font-semibold',
  // Coach Schedule (design/AdminSchedule.dc.html): at least 160 px, centred. On a 360 px
  // phone it may shrink and wrap rather than push the arrows under 44 px.
  packed:
    'min-w-0 shrink basis-40 text-center text-body font-semibold text-balance md:min-w-40 md:basis-auto',
  // Book's "Day" heading row: 13 px muted, like the drawn range text (design/Main.dc.html).
  small: 'text-label text-muted',
}

type WeekNavProps = {
  /** The week shown: "28 Sep – 4 Oct" (customer), "28 Sep – 4 Oct 2026" (coach). Read out
   *  when it changes. */
  label: string
  onPrevious: () => void
  onNext: () => void
  /** At the start of the booking window. The arrow keeps focus but does nothing. */
  previousDisabled?: boolean
  /** At the end of the booking window. */
  nextDisabled?: boolean
  /** Coach: shows a "Today" button after the arrows. */
  onToday?: () => void
  /** Customer Schedule: across the full width on phones, packed with 8 px gaps from 768 px. */
  stretch?: boolean
  /** sm: the 13 px muted label of Book's "Day" row. */
  size?: 'md' | 'sm'
}

/**
 * Previous and next week around the week's dates (design/Schedule.dc.html,
 * AdminSchedule.dc.html): 44 px icon buttons with 18 px chevrons, the label between them.
 */
export function WeekNav({
  label,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
  onToday,
  stretch = false,
  size = 'md',
}: WeekNavProps) {
  const labelLook = size === 'sm' ? 'small' : stretch ? 'stretch' : 'packed'
  return (
    <div
      role="group"
      aria-label="Week"
      className={cn(
        'flex items-center',
        stretch ? 'justify-between md:justify-start md:gap-2' : 'gap-1',
      )}
    >
      {/* aria-disabled, not disabled: a disabled button would drop focus to the page. */}
      <IconButton
        label="Previous week"
        aria-disabled={previousDisabled || undefined}
        onClick={() => {
          if (!previousDisabled) onPrevious()
        }}
      >
        <ChevronLeftIcon size={18} />
      </IconButton>
      <span aria-live="polite" className={labelLooks[labelLook]}>
        {label}
      </span>
      <IconButton
        label="Next week"
        aria-disabled={nextDisabled || undefined}
        onClick={() => {
          if (!nextDisabled) onNext()
        }}
      >
        <ChevronRightIcon size={18} />
      </IconButton>
      {onToday && (
        <button
          type="button"
          onClick={onToday}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-control px-3 text-sm font-medium text-accent hover:bg-subtle"
        >
          Today
        </button>
      )}
    </div>
  )
}
