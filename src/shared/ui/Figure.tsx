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
    <div className="flex flex-col gap-0.5">
      <span
        className={cn('text-title font-semibold leading-[1.2]', tone === 'warn' && 'text-warn')}
      >
        {value}
      </span>
      <span className="text-label text-muted">{caption}</span>
    </div>
  )
}
