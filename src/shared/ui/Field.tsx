import { type ComponentPropsWithRef, type ReactNode, useId } from 'react'

import { cn } from '@/shared/lib/cn'

type FieldSize = 'lg' | 'md' | 'sm' | 'row'
type FieldWidth = 'full' | 'number' | 'time' | 'price'

type FieldProps = Omit<ComponentPropsWithRef<'input'>, 'size' | 'prefix' | 'width'> & {
  /**
   * Always a real label (DESIGN §5). Leave it out only when something else labels the
   * input: a FieldRow's htmlFor, or aria-labelledby.
   */
  label?: string
  /** Keeps the label for screen readers only: the search box. */
  hideLabel?: boolean
  /** 12 px muted line under the input, linked with aria-describedby. */
  help?: ReactNode
  /**
   * A polite live region under the help ("Checking…", "That username is available.").
   * Pass null to keep the region in place before the first message.
   */
  status?: ReactNode
  /** Wording from messages.ts. Sets aria-invalid and an orange border. */
  error?: string
  /** lg 48 px (Log in), md 46 px (default), sm 44 px (search), row 44 px (Settings). */
  size?: FieldSize
  /** inline: an 80 px label column beside the input (Add students' student names). */
  layout?: 'stacked' | 'inline'
  /**
   * Text inside the box before the input: "RM". With a label it joins the input's name,
   * visually hidden ("Amount (RM)"), and the drawn one is hidden from screen readers;
   * without a label it describes the input.
   */
  prefix?: string
  /** Text after the input: "min", "hours", "weeks", "lessons", "package". */
  unit?: string
  /** Numbers and times are right-aligned. */
  align?: 'start' | 'end'
  /** full (default), number 64 px, time 96 px, price 100 % then 90 px from 768 px. */
  width?: FieldWidth
}

// UI kit spec §3.3, from Login.dc.html, AdminStudents.dc.html, AdminAddStudents.dc.html
// and AdminSettings.dc.html.
const boxSizes: Record<FieldSize, string> = {
  lg: 'h-12 rounded-control px-3.5', // 16 px text: also stops iOS zooming in on focus
  md: 'h-11.5 rounded-control px-3',
  sm: 'h-11 rounded-control px-3.5',
  row: 'h-11 rounded-small px-2.5',
}

const textSizes: Record<FieldSize, string> = {
  lg: 'text-base',
  md: 'text-sm',
  sm: 'text-sm',
  row: 'text-sm',
}

const widths: Record<FieldWidth, string> = {
  full: 'w-full',
  number: 'w-16',
  time: 'w-24',
  price: 'w-full md:w-22.5',
}

// The inline label matches the input's height, so it sits level with the input and
// stays at the top when a hint or error appears under the input.
const inlineLabelHeights: Record<FieldSize, string> = {
  lg: 'h-12',
  md: 'h-11.5',
  sm: 'h-11',
  row: 'h-11',
}

const box = 'min-w-0 border border-field bg-white leading-[normal] text-ink'
// Focus is the global ring (index.css); invalid, disabled and read-only are proposed.
const inputStates =
  'aria-[invalid=true]:border-warn disabled:bg-subtle disabled:text-muted read-only:bg-subtle'
// The prefixed box carries the ring and the states of the input inside it.
const prefixBoxStates =
  'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent has-[[aria-invalid=true]]:border-warn has-disabled:bg-subtle has-[input:read-only]:bg-subtle'

/**
 * A labelled single-line input (UI kit spec §3.3), with optional help, status and error
 * text, a prefix ("RM"), a unit ("min") and an inline label. Also the search box
 * (type="search", hideLabel). The id defaults to useId(); pass one to match a drawing
 * (login-username). The unit, help, status and error get `${id}-unit`, `${id}-help`,
 * `${id}-status` and `${id}-error`, listed in aria-describedby after any the caller passes.
 */
export function Field({
  label,
  hideLabel = false,
  help,
  status,
  error,
  size = 'md',
  layout = 'stacked',
  prefix,
  unit,
  align = 'start',
  width = 'full',
  id: idProp,
  type = 'text',
  enterKeyHint,
  className,
  'aria-describedby': describedByProp,
  'aria-invalid': ariaInvalid,
  ...rest
}: FieldProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const ids = {
    prefix: `${id}-prefix`,
    unit: `${id}-unit`,
    help: `${id}-help`,
    status: `${id}-status`,
    error: `${id}-error`,
  }
  // "Amount (RM)" (coach-students §7): the prefix is part of the name when there is a label.
  const prefixInName = Boolean(prefix) && Boolean(label)
  const describedBy =
    cn(
      describedByProp,
      prefix && !prefixInName ? ids.prefix : null,
      unit && ids.unit,
      help ? ids.help : null,
      status ? ids.status : null,
      error && ids.error,
    ) || undefined
  const invalid = Boolean(error) || ariaInvalid === true || ariaInvalid === 'true'
  const end = align === 'end' && 'text-right'
  // The space sits outside the hidden text, so every name computation keeps it.
  const labelText = prefixInName ? (
    <>
      {label} <span className="sr-only">({prefix})</span>
    </>
  ) : (
    label
  )

  const input = (
    <input
      {...rest}
      id={id}
      type={type}
      enterKeyHint={enterKeyHint ?? (type === 'search' ? 'search' : undefined)}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={
        prefix
          ? cn(
              'h-full min-w-0 flex-1 bg-transparent leading-[normal] text-ink focus-visible:outline-none disabled:text-muted',
              textSizes[size],
              end,
            )
          : cn(box, inputStates, boxSizes[size], textSizes[size], widths[width], end)
      }
    />
  )

  const boxed = prefix ? (
    <div
      className={cn('flex items-center gap-2', box, boxSizes[size], widths[width], prefixBoxStates)}
    >
      <span
        id={ids.prefix}
        aria-hidden={prefixInName || undefined}
        className={cn('shrink-0 leading-[normal] text-muted', textSizes[size])}
      >
        {prefix}
      </span>
      {input}
    </div>
  ) : (
    input
  )

  const control = unit ? (
    <div className="flex shrink-0 items-center gap-2">
      {boxed}
      {/* 52 px as drawn; a minimum so a longer unit ("packages") still fits. */}
      <span id={ids.unit} className="min-w-13 text-label text-muted">
        {unit}
      </span>
    </div>
  ) : (
    boxed
  )

  const messages = (
    <>
      {help ? (
        <p id={ids.help} className="text-small leading-[1.45] text-muted">
          {help}
        </p>
      ) : null}
      {status !== undefined && (
        // While empty it stays in place for screen readers but takes no room: the negative
        // margin cancels the column's gap above it.
        <p
          id={ids.status}
          aria-live="polite"
          className={cn(
            'text-small leading-[1.45] text-muted',
            layout === 'inline' || size === 'row' ? 'empty:-mt-1' : 'empty:-mt-1.5',
          )}
        >
          {status}
        </p>
      )}
      {error && (
        <p id={ids.error} className="text-label leading-[1.45] text-warn">
          {error}
        </p>
      )}
    </>
  )

  if (layout === 'inline') {
    return (
      <div className={cn('flex items-start gap-3', className)}>
        {label && (
          <label
            htmlFor={id}
            className={
              hideLabel
                ? 'sr-only'
                : cn(
                    'flex w-20 shrink-0 items-center text-sm leading-[normal] font-medium text-ink',
                    inlineLabelHeights[size],
                  )
            }
          >
            {labelText}
          </label>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {control}
          {messages}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', size === 'row' ? 'gap-1' : 'gap-1.5', className)}>
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
          {labelText}
        </label>
      )}
      {control}
      {messages}
    </div>
  )
}
