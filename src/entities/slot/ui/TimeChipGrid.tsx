import { useId } from 'react'

import { formatTime, toMyt } from '@/shared/lib/time'
import { Chip } from '@/shared/ui/Chip'

import { splitByPartOfDay } from '../model/partOfDay'
import type { Slot } from '../model/types'
import { CHIP_GRID } from './chipGrid'

type TimeChipGridProps = {
  /** One day's start times in start order (`slotsOfDay`), free and crossed out. */
  slots: readonly Slot[]
  /** The picked start's `starts_at`, or null. A crossed-out one may be picked: it explains itself. */
  selected: string | null
  /** A chip was pressed: free ones to book, crossed-out ones to see why (DESIGN §4 step 7). */
  onSelect: (slot: Slot) => void
}

const PARTS = [
  { key: 'morning', label: 'Morning' },
  { key: 'evening', label: 'Evening' },
] as const

function sameInstant(a: string, b: string): boolean {
  return toMyt(a).getTime() === toMyt(b).getTime()
}

/**
 * Book's start times for the chosen day (DESIGN §3 Time chip; design/Main.dc.html:128-146):
 * "Morning" and "Evening", each only when it has starts, with a chip per start. Free chips
 * are white, the picked one accent; crossed-out chips stay pressable and turn orange when
 * picked. Each part is a group named by its label, and each chip reads "7:30 pm,
 * available" or "7:00 pm, not available". Renders nothing for a day with no starts.
 */
export function TimeChipGrid({ slots, selected, onSelect }: TimeChipGridProps) {
  const id = useId()
  if (slots.length === 0) return null
  const parts = splitByPartOfDay(slots)

  return (
    <div className="flex flex-col gap-3.5">
      {PARTS.map(({ key, label }) =>
        parts[key].length === 0 ? null : (
          <div
            key={key}
            role="group"
            aria-labelledby={`${id}-${key}`}
            className="flex flex-col gap-2"
          >
            <span id={`${id}-${key}`} className="text-small text-muted">
              {label}
            </span>
            <div className={CHIP_GRID}>
              {parts[key].map((slot) => {
                const time = formatTime(slot.starts_at)
                return (
                  <Chip
                    key={slot.starts_at}
                    label={time}
                    state={slot.ok ? 'free' : 'clash'}
                    selected={selected !== null && sameInstant(slot.starts_at, selected)}
                    accessibleLabel={`${time}, ${slot.ok ? 'available' : 'not available'}`}
                    onClick={() => onSelect(slot)}
                  />
                )
              })}
            </div>
          </div>
        ),
      )}
    </div>
  )
}
