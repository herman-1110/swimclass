import { type ReactNode, useRef } from 'react'

import { cn } from '@/shared/lib/cn'
import { StickyBar } from '@/shared/ui/StickyBar'

import { useFooterScrollPadding } from './useFooterScrollPadding'

type SummaryFrameProps = {
  children: ReactNode
  /** Layout only: the page's grid area. */
  className?: string
}

// design/Main.dc.html .summary (:29, :37). Phones: StickyBar's footer, full bleed with a
// --line rule on top, 16 × 20 padding and 12 px gaps, stuck above the tab bar (DESIGN §4
// item 7, §5; book spec C4). From 768 px a card in the right column: 1 px --frame, radius
// 12, 20 px padding, sticky 24 px from the top.
const CARD_FROM_MD =
  'md:top-6 md:bottom-auto md:mx-0 md:mt-0 md:rounded-frame md:border md:border-frame md:p-5'

/** The booking summary's box: a sticky footer on phones, a sticky side card from 768 px. */
export function SummaryFrame({ children, className }: SummaryFrameProps) {
  const ref = useRef<HTMLDivElement>(null)
  useFooterScrollPadding(ref)
  return (
    <StickyBar
      ref={ref}
      padding="md"
      role="region"
      aria-label="Booking summary"
      className={cn(CARD_FROM_MD, className)}
    >
      {children}
    </StickyBar>
  )
}
