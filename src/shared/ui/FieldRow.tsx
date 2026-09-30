import { type ReactNode, useId } from 'react'

import { cn } from '@/shared/lib/cn'

type FieldRowControl = 'auto' | 'options' | 'full' | 'email' | 'prices'

type FieldRowProps = {
  /** "Travel gap". */
  label: string
  /** "Blocked before and after every lesson". */
  help?: string
  /**
   * The control's id: the label becomes its <label>. The help, note and error then get
   * the ids `${htmlFor}-help`, `${htmlFor}-note` and `${htmlFor}-error`; list the ones
   * that show in the control's aria-describedby.
   */
  htmlFor?: string
  /**
   * The control is a set of inputs ("1 hour" and "2 hours", the three prices): it gets
   * role="group", named by the label and described by the help, note and error.
   */
  group?: boolean
  /** A Field or Select of size row, a standalone Checkbox, a Textarea of look row, text… */
  control: ReactNode
  /**
   * auto (default): beside the label, 8 px gaps (an input and its unit). options: 16 px
   * gaps (two checkboxes). full: its own full-width line (a textarea). email: a full line
   * on phones, a 240 px box beside the label from 768 px. prices: three columns on phones,
   * a row from 768 px, with 12 px row padding.
   */
  controlLayout?: FieldRowControl
  /** stack: the control goes under the label at every width (Payment instructions). */
  layout?: 'inline' | 'stack'
  /** A full-width note under the row (a risky change). */
  note?: ReactNode
  /** Wording from messages.ts, full width under the row. */
  error?: string
}

// UI kit spec §3.21, AdminSettings.dc.html:31-50, 62-72.
const row =
  'flex min-h-13.5 flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t border-line-row px-3.5 first:border-t-0 md:px-4'

const controls: Record<FieldRowControl, string> = {
  auto: 'flex shrink-0 items-center gap-2',
  options: 'flex shrink-0 items-center gap-4',
  full: 'min-w-0 flex-[1_1_100%]',
  email: 'min-w-0 flex-[1_1_100%] md:flex-[0_0_240px]',
  prices: 'grid flex-[1_1_100%] grid-cols-3 gap-2.5 md:flex md:flex-none',
}

/**
 * One setting in a FieldList (UI kit spec §3.21): label and help on the left, the control
 * on the right, wrapping under the label when the row is narrow.
 */
export function FieldRow({
  label,
  help,
  htmlFor,
  group = false,
  control,
  controlLayout = 'auto',
  layout = 'inline',
  note,
  error,
}: FieldRowProps) {
  const autoId = useId()
  const base = htmlFor ?? autoId
  const ids = {
    label: `${base}-label`,
    help: `${base}-help`,
    note: `${base}-note`,
    error: `${base}-error`,
  }
  const hasMessage = Boolean(note) || Boolean(error)

  return (
    <div
      className={cn(
        row,
        controlLayout === 'prices'
          ? 'py-3'
          : layout === 'stack'
            ? 'py-2.5 md:py-3'
            : 'py-2.5 md:py-1.25',
        // From 768 px the row stays on one line, unless the control or a message must go under it.
        layout === 'inline' && !hasMessage && 'md:flex-nowrap',
      )}
    >
      <div className="flex min-w-0 flex-[1_1_160px] flex-col gap-px md:flex-[1_1_auto]">
        {htmlFor ? (
          <label id={ids.label} htmlFor={htmlFor} className="text-sm leading-[normal] font-medium">
            {label}
          </label>
        ) : (
          <span id={ids.label} className="text-sm leading-[normal] font-medium">
            {label}
          </span>
        )}
        {help && (
          <span id={ids.help} className="text-small leading-[1.4] text-muted">
            {help}
          </span>
        )}
      </div>
      <div
        className={controls[controlLayout]}
        role={group ? 'group' : undefined}
        aria-labelledby={group ? ids.label : undefined}
        aria-describedby={
          group
            ? cn(help && ids.help, note ? ids.note : null, error && ids.error) || undefined
            : undefined
        }
      >
        {control}
      </div>
      {note ? (
        <div
          id={ids.note}
          className="basis-full rounded-small bg-subtle px-2.5 py-2 text-small leading-[1.4] text-ink"
        >
          {note}
        </div>
      ) : null}
      {error && (
        <p id={ids.error} className="basis-full text-small leading-[1.4] text-warn">
          {error}
        </p>
      )}
    </div>
  )
}
