import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

type SectionTitleProps = ComponentPropsWithoutRef<'h2'> & {
  as?: 'h2' | 'h3'
  /** A 13 px muted line under the title, 4 px above and 12 px below (Settings sections). */
  note?: ReactNode
}

/**
 * A 15 px semibold section heading (UI kit spec §3.30): "Today, Sat 26 Sep", "Needs
 * attention", "Message all customers", "Booking rules". Give it an id to name its
 * section (aria-labelledby). className is for margins.
 */
export function SectionTitle({ as: Element = 'h2', note, className, ...rest }: SectionTitleProps) {
  const title = <Element {...rest} className={cn('text-body font-semibold', className)} />
  if (!note) return title
  return (
    <>
      {title}
      <p className="mt-1 mb-3 text-label leading-[1.45] text-muted">{note}</p>
    </>
  )
}
