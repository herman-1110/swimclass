import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/lib/cn'

type SectionLabelProps = ComponentPropsWithoutRef<'h2'> & {
  /**
   * p (default) for a label that isn't a heading ("Day", "Other adjustments"); h2 or h3
   * when it heads a section (My classes' "Upcoming"); span inside a line of text.
   */
  as?: 'h2' | 'h3' | 'span' | 'p'
}

/**
 * The section label (DESIGN §2: 13 px 500 muted): "Day", "Start time · Tue 29 Sep",
 * "Upcoming", "Other adjustments" (UI kit spec §3.30). className is for margins.
 */
export function SectionLabel({ as: Element = 'p', className, ...rest }: SectionLabelProps) {
  return <Element {...rest} className={cn('text-label font-medium text-muted', className)} />
}
