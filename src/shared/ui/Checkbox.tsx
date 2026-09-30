import { type ComponentPropsWithRef, type ReactNode, useId } from 'react'

import { cn } from '@/shared/lib/cn'

type CheckboxProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'size'> & {
  /** The text beside the box. Left out only for 'standalone' (a FieldRow's htmlFor labels it). */
  label?: ReactNode
  /** 12 px muted line under the label, indented to the text, linked with aria-describedby. */
  help?: ReactNode
  /** md: 20 px box, 14 px / 1.4 label (Book). sm: 18 px box (the default, everywhere else). */
  size?: 'md' | 'sm'
  /** 14 px ('sm', the default) or 13 px ('label': "Pin as a banner until I remove it"). */
  labelSize?: 'sm' | 'label'
  /**
   * row (default): a 44 px row, box then label. inline: a compact option that sits beside
   * others ("1 hour", "2 hours"). standalone: the box alone in a 44 × 44 target, labelled
   * by the row it sits in (Settings' "Approve new accounts").
   */
  look?: 'row' | 'inline' | 'standalone'
}

// UI kit spec §3.6: Main.dc.html:155-157, AdminSchedule.dc.html:235-237,
// AdminAddStudents.dc.html:97-101, AdminSettings.dc.html:43-45. Native checkboxes in the
// accent colour; the label around the box makes the whole row the target.
const boxes = { md: 'size-5', sm: 'size-4.5' }
const input = 'shrink-0 cursor-pointer accent-accent disabled:cursor-default'
const rowStates = 'cursor-pointer has-disabled:cursor-default has-disabled:text-muted'

/** A native checkbox with its label (UI kit spec §3.6). The id defaults to useId(). */
export function Checkbox({
  label,
  help,
  size = 'sm',
  labelSize = 'sm',
  look = 'row',
  id: idProp,
  className,
  'aria-describedby': describedByProp,
  ...rest
}: CheckboxProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const helpId = `${id}-help`
  // Only the row look has room for a help line.
  const hasHelp = look === 'row' && Boolean(help)
  const describedBy = cn(describedByProp, hasHelp && helpId) || undefined

  const box = (
    <input
      {...rest}
      id={id}
      type="checkbox"
      aria-describedby={describedBy}
      className={cn(input, boxes[size])}
    />
  )

  if (look === 'standalone') {
    // The drawn 18 px box with 13 px margins, as a 44 × 44 label so all of it is clickable.
    // The negative margins keep its layout height at the drawn 18 px, so a settings row
    // stays 54 px tall; the label still reaches 13 px above and below the box.
    return (
      <label
        className={cn(
          'flex size-11 shrink-0 items-center justify-center -my-3.25',
          rowStates,
          className,
        )}
      >
        {box}
      </label>
    )
  }

  if (look === 'inline') {
    return (
      <label
        className={cn(
          'flex min-h-11 items-center gap-2 text-sm leading-[normal]',
          rowStates,
          className,
        )}
      >
        {box}
        {label}
      </label>
    )
  }

  const row = (
    <label className={cn('flex min-h-11 items-center gap-2.5', rowStates, !hasHelp && className)}>
      {box}
      <span
        className={cn(
          labelSize === 'label' ? 'text-label' : 'text-sm',
          size === 'md' ? 'leading-[1.4]' : 'leading-[normal]',
        )}
      >
        {label}
      </span>
    </label>
  )

  if (!hasHelp) return row

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {row}
      {/* Indented to the label: the box plus the 10 px gap. */}
      <p id={helpId} className={cn('text-small text-muted', size === 'md' ? 'pl-7.5' : 'pl-7')}>
        {help}
      </p>
    </div>
  )
}
