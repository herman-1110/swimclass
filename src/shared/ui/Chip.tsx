import type { ComponentPropsWithRef } from 'react'

import { cn } from '@/shared/lib/cn'

// The four looks of a time chip (DESIGN §3; design/Main.dc.html, toChip).
const looks = {
  free: 'border-field bg-white text-ink',
  freeSelected: 'border-accent bg-accent text-white',
  clash: 'border-subtle bg-subtle text-muted line-through',
  clashSelected: 'border-warn bg-warn-tint text-warn line-through',
}

type ChipProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  /** The visible text ("7:30 pm"). */
  label: string
  /** clash: crossed out. It stays pressable: pressing it explains why (DESIGN §4). */
  state: 'free' | 'clash'
  /** The picked chip (aria-pressed). */
  selected: boolean
  /** The name read out ("7:30 pm, available", "7:00 pm, not available"). */
  accessibleLabel: string
}

/**
 * A time chip: 44 px, radius 10, 13 px (14 px from 768 px). Free chips are white with a
 * --field border; the picked one is accent. Clashing chips are crossed out on --subtle, and
 * turn --warn when picked. Lay them out in a grid (TimeChipGrid in entities/slot).
 */
export function Chip({
  label,
  state,
  selected,
  accessibleLabel,
  className,
  type = 'button',
  ...rest
}: ChipProps) {
  const look =
    state === 'clash'
      ? selected
        ? looks.clashSelected
        : looks.clash
      : selected
        ? looks.freeSelected
        : looks.free
  return (
    <button
      type={type}
      aria-pressed={selected}
      aria-label={accessibleLabel}
      className={cn(
        'h-11 cursor-pointer rounded-control border text-label font-medium md:text-sm',
        look,
        className,
      )}
      {...rest}
    >
      {label}
    </button>
  )
}
