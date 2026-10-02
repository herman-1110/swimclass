import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

type FigureProps = {
  /** The number: "2", "15" (or a Skeleton while it loads). */
  value: ReactNode
  /** "Unpaid · Hana, Wei Jie". */
  caption: string
  /** warn for a number that needs attention (Unpaid). */
  tone?: 'ink' | 'warn'
}

/**
 * A figure over its caption (UI kit spec §3.17, AdminStudents.dc.html:79-92). The page lays
 * them out: `grid grid-cols-3 gap-3 md:flex md:gap-14`.
 */
export function Figure({ value, caption, tone = 'ink' }: FigureProps) {
  return (
    // The caption names groups, so it wraps, inside a long word too (DESIGN §5); from 768 px,
    // where the figures sit in a row at their own widths, within 320 px, so a long list of
    // names doesn't squeeze the figures beside it.
    <div className="flex min-w-0 flex-col gap-0.5 md:max-w-80">
      <span
        className={cn('text-title font-semibold leading-[1.2]', tone === 'warn' && 'text-warn')}
      >
        {value}
      </span>
      <span className="text-label text-muted wrap-anywhere">{caption}</span>
    </div>
  )
}
