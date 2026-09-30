import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/shared/lib/cn'

type CardPadding = 'md' | 'sm' | 'list' | 'none'

type CardProps = ComponentPropsWithoutRef<'section'> & {
  as?: 'div' | 'section' | 'aside'
  /**
   * md 20 px (default: Book's package and summary, Add students' preview), sm 14 × 16
   * (student cards), list 4 20 8 (My classes' packages, whose rows pad themselves), none.
   */
  padding?: CardPadding
  /** md: flat on phones, framed from 768 px (Book's cards, My classes' packages). */
  framedFrom?: 'base' | 'md'
}

// UI kit spec §3.20: 1 px --frame, radius 12, white. className is for layout: the inner
// flex column and its gap, margins, grid placement, and Book's `md:sticky md:top-6`.
const framed = {
  base: 'rounded-frame border border-frame bg-white',
  md: 'md:rounded-frame md:border md:border-frame md:bg-white',
}

const paddings: Record<'base' | 'md', Record<CardPadding, string>> = {
  base: { md: 'p-5', sm: 'px-4 py-3.5', list: 'px-5 pt-1 pb-2', none: '' },
  md: { md: 'md:p-5', sm: 'md:px-4 md:py-3.5', list: 'md:px-5 md:pt-1 md:pb-2', none: '' },
}

/** A framed box (UI kit spec §3.20). */
export function Card({
  as: Element = 'div',
  padding = 'md',
  framedFrom = 'base',
  className,
  ...rest
}: CardProps) {
  return (
    <Element
      {...rest}
      className={cn(framed[framedFrom], paddings[framedFrom][padding], className)}
    />
  )
}
