import './Select.css'

import { type ComponentPropsWithRef, type ReactNode, useId } from 'react'

import { cn } from '@/shared/lib/cn'

import { ChevronDownIcon } from './icons/ChevronDownIcon'

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

// UI kit spec §3.5, restyled (Herman, 6 Oct 2026): the native select without the browser's
// arrow, our chevron at the right instead, in the text boxes' border, radius and heights.
// The open list is Select.css's.
const sizes = {
  md: 'h-11.5 w-full rounded-control pr-10 pl-3',
  row: 'h-11 rounded-small pr-9 pl-2.5',
}

// The chevron sits in the select's right padding; clicks go through it to the select.
const chevronRight = { md: 'right-3', row: 'right-2.5' }

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
      <div className={cn('relative flex min-w-0', size === 'md' && 'w-full')}>
        <select
          {...rest}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(
            'select-control peer min-w-0 cursor-pointer appearance-none border border-field bg-white text-sm leading-[normal] text-ink transition-colors hover:border-muted/50 aria-[invalid=true]:border-warn disabled:cursor-default disabled:bg-subtle disabled:text-muted disabled:hover:border-field',
            sizes[size],
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          size={18}
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted transition-transform peer-open:rotate-180 peer-disabled:opacity-50 motion-reduce:transition-none',
            chevronRight[size],
          )}
        />
      </div>
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
