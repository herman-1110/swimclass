import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

import { Fieldset } from './Fieldset'

export type SegmentedOption = { value: string; label: string; disabled?: boolean }

type SegmentedProps = {
  /** One name for the segments' radios. */
  name: string
  /** "Lesson type"; Book's "Lesson length" is hidden. */
  legend: string
  hideLegend?: boolean
  /** The fieldset's id (default useId()); the help and error get `${id}-help` and `${id}-error`. */
  id?: string
  /** 12 px muted line under the track ("Up to 3 students from the same account per lesson."). */
  help?: ReactNode
  /**
   * Wording from messages.ts, under the track (Add students' group_full). Linked to the
   * group with aria-describedby; the radios get aria-invalid.
   */
  error?: string
  options: readonly SegmentedOption[]
  value: string
  onChange: (value: string) => void
  /** narrow: the track stops at 426 px (Book). none (default): it fills the width (Add students). */
  maxWidth?: 'none' | 'narrow'
  className?: string
}

// UI kit spec §3.10: Main.dc.html:115-117, :331-337; AdminAddStudents.dc.html:76-79,
// :159-169. The chosen segment's border is --line as DESIGN §3 says (the drawings use
// #E4E4E0, which is not a token).
const segment = cn(
  'relative flex h-11 flex-1 cursor-pointer items-center justify-center rounded-small border border-transparent text-sm leading-[normal] font-medium text-muted',
  'has-checked:border-line has-checked:bg-white has-checked:font-semibold has-checked:text-ink',
  'has-disabled:cursor-default has-disabled:opacity-50',
  // The radio is visually hidden, so its focus ring goes on the segment.
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
)

/**
 * A segmented control (UI kit spec §3.10) built from native radios in a fieldset: one Tab
 * stop, arrow keys choose, announced as "radio button, 1 of 2, checked".
 */
export function Segmented({
  name,
  legend,
  hideLegend,
  id,
  help,
  error,
  options,
  value,
  onChange,
  maxWidth = 'none',
  className,
}: SegmentedProps) {
  return (
    <Fieldset
      id={id}
      legend={legend}
      hideLegend={hideLegend}
      help={help}
      error={error}
      className={className}
    >
      <div
        className={cn(
          'flex gap-0.5 rounded-control bg-subtle p-0.75',
          // Main.dc.html:115 says max-width 420px on a content-box track with 3 px padding,
          // so the drawn track is 426 px wide.
          maxWidth === 'narrow' && 'max-w-[426px]',
        )}
      >
        {options.map((option) => (
          <label key={option.value} className={segment}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              disabled={option.disabled}
              aria-invalid={error ? true : undefined}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </Fieldset>
  )
}
