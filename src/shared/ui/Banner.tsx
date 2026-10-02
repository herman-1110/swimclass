import type { ComponentPropsWithRef, ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

type BannerProps = ComponentPropsWithRef<'div'> & {
  /** A bold lead-in, then a space: "Coach:", "How to pay:". */
  label?: string
  /** neutral (default): the --subtle box. warn: a page-level problem (proposed). */
  tone?: 'neutral' | 'warn'
  /** A button beside the text: "Try again". */
  action?: ReactNode
  children: ReactNode
}

// UI kit spec §3.22: Main.dc.html:69, MyClasses.dc.html:126. Static text by default; pass
// role="status" (a notice after an action) or role="alert" (a failed load), and ref and
// tabIndex={-1} when the page moves focus to it. className is for layout (margins). Its text
// wraps even inside a word, so a pasted link never runs out of the box (DESIGN §5).
const tones = {
  neutral: 'bg-subtle text-ink',
  warn: 'bg-warn-tint text-warn',
}

/** A tinted note box with an optional bold lead-in and action (UI kit spec §3.22). */
export function Banner({
  label,
  tone = 'neutral',
  action,
  className,
  children,
  ...rest
}: BannerProps) {
  const text = (
    <>
      {label && <span className="font-semibold">{label}</span>}
      {label && ' '}
      {children}
    </>
  )

  if (!action) {
    return (
      <div
        {...rest}
        className={cn(
          'rounded-control px-3.5 py-3 text-label leading-normal wrap-anywhere',
          tones[tone],
          className,
        )}
      >
        {text}
      </div>
    )
  }

  // With a 44 px action the box pads the text instead, so one line stays 48 px tall.
  return (
    <div
      {...rest}
      className={cn(
        'flex items-center gap-3 rounded-control py-0.5 pr-1.5 pl-3.5 text-label leading-normal',
        tones[tone],
        className,
      )}
    >
      <div className="min-w-0 flex-1 py-2.5 wrap-anywhere">{text}</div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}
