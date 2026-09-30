import { type ComponentPropsWithRef, type KeyboardEvent, type ReactNode, useId } from 'react'

import { cn } from '@/shared/lib/cn'

type FieldsetSpacing = 'loose' | 'normal' | 'tight'

type FieldsetProps = Omit<ComponentPropsWithRef<'fieldset'>, 'children'> & {
  /** Names the group: "Who’s this lesson for?", "Lesson type", "Paid by". */
  legend: string
  /** Keeps the legend for screen readers only (Book's "Lesson length"). */
  hideLegend?: boolean
  /** Space under the legend and above the help: loose 8 px, normal 6 px (default), tight 2 px. */
  spacing?: FieldsetSpacing
  /** 12 px muted line under the group, linked with aria-describedby. */
  help?: ReactNode
  /** Wording from messages.ts, under the group, linked with aria-describedby. */
  error?: string
  children: ReactNode
}

// UI kit spec §3.8: Main.dc.html:71-72 (8 px), AdminAddStudents.dc.html:75, 84 (6 px),
// AdminStudents.dc.html:292 (2 px). Preflight already clears the margin, padding and border.
const legendSpacing: Record<FieldsetSpacing, string> = {
  loose: 'mb-2',
  normal: 'mb-1.5',
  tight: 'mb-0.5',
}

const gaps: Record<FieldsetSpacing, string> = {
  loose: 'gap-2',
  normal: 'gap-1.5',
  tight: 'gap-0.5',
}

const steps: Partial<Record<string, number>> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
}

/**
 * Arrow keys move the choice between the radios of one name in this fieldset, wrapping at
 * the ends and skipping disabled ones: what browsers do for native radios, done here so
 * it behaves the same everywhere and can be tested. With Alt, Ctrl or Meta held the key
 * belongs to the browser (Alt+Left is Back), as it does for native radios; Shift+Arrow
 * still moves, as in Chrome.
 */
function moveChoice(event: KeyboardEvent<HTMLFieldSetElement>) {
  if (event.altKey || event.ctrlKey || event.metaKey) return
  const step = steps[event.key]
  const from = event.target
  if (!step || !(from instanceof HTMLInputElement) || from.type !== 'radio') return
  const radios = Array.from(
    event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
  ).filter((radio) => radio.name === from.name && !radio.disabled)
  const index = radios.indexOf(from)
  if (index === -1 || radios.length < 2) return
  event.preventDefault()
  const next = radios[(index + step + radios.length) % radios.length]
  next.focus()
  // A click checks it and fires the change, like choosing it with the mouse.
  next.click()
}

/** A borderless fieldset with a section-label legend (UI kit spec §3.8). */
export function Fieldset({
  legend,
  hideLegend = false,
  spacing = 'normal',
  help,
  error,
  id: idProp,
  className,
  onKeyDown,
  'aria-describedby': describedByProp,
  children,
  ...rest
}: FieldsetProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy = cn(describedByProp, help ? helpId : null, error && errorId) || undefined

  return (
    <fieldset
      {...rest}
      id={id}
      aria-describedby={describedBy}
      className={cn('flex min-w-0 flex-col', gaps[spacing], className)}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (!event.defaultPrevented) moveChoice(event)
      }}
    >
      <legend
        className={
          hideLegend ? 'sr-only' : cn('text-label font-medium text-muted', legendSpacing[spacing])
        }
      >
        {legend}
      </legend>
      {children}
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
    </fieldset>
  )
}
