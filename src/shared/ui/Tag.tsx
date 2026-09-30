import type { ComponentPropsWithRef } from 'react'

import { cn } from '@/shared/lib/cn'

type TagProps = ComponentPropsWithRef<'span'> & {
  /**
   * neutral (default): the type tag, "1-to-2". accent: a read-only range chip,
   * "5:30 pm – 10:00 pm" (put several in a `flex flex-wrap gap-1.5` row).
   */
  tone?: 'neutral' | 'accent'
}

// UI kit spec §3.15: radius 6 px as drawn (Main.dc.html:78, AdminStudents.dc.html:118,
// AdminSettings.dc.html:58-59); rounded-block is the same 6 px value.
const tones = {
  neutral: 'shrink-0 rounded-block bg-tag px-2 py-0.5 text-small font-semibold text-tag-ink',
  accent: 'rounded-block bg-accent-tint px-2.5 py-1 text-label font-semibold text-accent',
}

/** A small label: plain text, no role (UI kit spec §3.15). */
export function Tag({ tone = 'neutral', className, ...rest }: TagProps) {
  return (
    <span
      {...rest}
      className={cn('inline-flex items-center whitespace-nowrap', tones[tone], className)}
    />
  )
}
