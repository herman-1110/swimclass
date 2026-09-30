import { type ComponentPropsWithRef, type ReactNode, useId } from 'react'

import { cn } from '@/shared/lib/cn'

export type SelectOption = {
  value: string
  label: string
  /** A disabled first option makes a "Choose" placeholder (value ""). */
  disabled?: boolean
}

type SelectProps = Omit<ComponentPropsWithRef<'select'>, 'size' | 'children'> & {
  /**
   * The visible label. Leave it out only when something else labels the select: a
   * FieldRow's htmlFor, or aria-labelledby.
   */
  label?: string
  hideLabel?: boolean
  /** 12 px muted line under the select, linked with aria-describedby. */
  help?: ReactNode
  /** Wording from messages.ts. Sets aria-invalid and an orange border. */
  error?: string
  /** md: 46 px, full width (forms and panels, the default). row: 44 px, as wide as its longest option (Settings). */
  size?: 'md' | 'row'
  options: readonly SelectOption[]
}

// UI kit spec §3.5: the native select with the browser's own arrow, as drawn
// (AdminStudents.dc.html:278-282, AdminAddStudents.dc.html:66-71, AdminSettings.dc.html:149).
const sizes = {
  md: 'h-11.5 w-full rounded-control px-3',
  row: 'h-11 rounded-small px-2.5',
}

/**
 * A labelled native select (UI kit spec §3.5). Keyboard and screen readers get the
 * browser's own control. Ids work as in Field.
 */
export function Select({
  label,
  hideLabel = false,
  help,
  error,
  size = 'md',
  options,
  id: idProp,
  className,
  'aria-describedby': describedByProp,
  'aria-invalid': ariaInvalid,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy = cn(describedByProp, help ? helpId : null, error && errorId) || undefined
  const invalid = Boolean(error) || ariaInvalid === true || ariaInvalid === 'true'

  return (
    // A row select keeps its own width (items-start stops the column stretching it).
    <div
      className={cn('flex flex-col', size === 'row' ? 'items-start gap-1' : 'gap-1.5', className)}
    >
      {label && (
        <label
          htmlFor={id}
          className={
            hideLabel
              ? 'sr-only'
              : size === 'row'
                ? 'text-small font-medium text-muted'
                : 'text-label font-medium text-muted'
          }
        >
          {label}
        </label>
      )}
      <select
        {...rest}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={cn(
          'min-w-0 cursor-pointer border border-field bg-white text-sm leading-[normal] text-ink aria-[invalid=true]:border-warn disabled:cursor-default disabled:bg-subtle disabled:text-muted',
          sizes[size],
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {help ? (
        <p id={helpId} className="text-small leading-[1.45] text-muted">
          {help}
        </p>
      ) : null}
      {error && (
        <p id={errorId} className="text-label leading-[1.45] text-warn">
          {error}
        </p>
      )}
    </div>
  )
}
