import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

type PillTone = 'accent' | 'warn' | 'neutral'

type PillProps = {
  /** accent: Paid. warn: Unpaid, only for things that need attention. neutral: past lessons. */
  tone: PillTone
  children: ReactNode
  /** A 12 px line under the pill: "Starts today", "Last lesson 1 Oct". */
  note?: ReactNode
  /** Default muted; warn for things that need attention ("Last lesson 1 Oct"). */
  noteTone?: 'muted' | 'warn'
}

// UI kit spec §3.16 (AdminStudents.dc.html:120, 136): 12 px semibold on a tinted, fully
// rounded background, padding 3 × 10. shared/ui knows no business words, so the entity
// decides that Paid is accent (DESIGN §3).
const tones: Record<PillTone, string> = {
  accent: 'bg-accent-tint text-accent',
  warn: 'bg-warn-tint text-warn',
  neutral: 'bg-tag text-tag-ink',
}

/** A status pill, optionally with a note under it (UI kit spec §3.16). */
export function Pill({ tone, children, note, noteTone = 'muted' }: PillProps) {
  const pill = (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.75 text-small font-semibold whitespace-nowrap',
        tones[tone],
      )}
    >
      {children}
    </span>
  )

  if (!note) return pill

  return (
    <span className="flex flex-col items-start gap-1">
      {pill}
      <span className={cn('text-small', noteTone === 'warn' ? 'text-warn' : 'text-muted')}>
        {note}
      </span>
    </span>
  )
}
