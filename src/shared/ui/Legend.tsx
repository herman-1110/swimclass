import { useWords } from '@/shared/i18n/context'
import { cn } from '@/shared/lib/cn'

import { uiWords } from './words'

// Swatch colours: the week grid's block colours (DESIGN §2).
const swatches = {
  free: 'border border-field bg-white',
  'booked-other': 'bg-booked-other',
  travel: 'bg-travel',
  accent: 'bg-accent',
  closed: 'bg-closed',
}

export type LegendItem = { label: string; tone: keyof typeof swatches }

type LegendProps = {
  /** In order: "Free", "Booked", "Travel", "Yours", "Closed" (customer); "Lesson",
   *  "Travel gap", "Closed" (coach). */
  items: readonly LegendItem[]
  /** tight: wraps with 12 px gaps (customer). wide: 18 px gaps (coach). */
  spacing?: 'tight' | 'wide'
  /** Only from 768 px, where the grid it explains is (the coach's). */
  hideOnPhones?: boolean
}

/**
 * The key to a week grid's colours (design/Schedule.dc.html, AdminSchedule.dc.html): 10 px
 * swatches, radius 3, before 12 px muted words.
 */
export function Legend({ items, spacing = 'tight', hideOnPhones = false }: LegendProps) {
  const w = useWords(uiWords)
  return (
    // role="list": Safari drops list semantics from lists without bullets.
    <ul
      role="list"
      aria-label={w.legend}
      className={cn(
        'm-0 list-none flex-wrap items-center p-0 text-small text-muted',
        hideOnPhones ? 'hidden md:flex' : 'flex',
        spacing === 'wide' ? 'gap-4.5' : 'gap-3',
      )}
    >
      {items.map((item) => (
        <li
          key={item.label}
          className={cn('flex items-center', spacing === 'wide' ? 'gap-1.5' : 'gap-[5px]')}
        >
          <span aria-hidden="true" className={cn('size-2.5 rounded-[3px]', swatches[item.tone])} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
