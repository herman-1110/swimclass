import { type ComponentPropsWithRef, type ReactNode, useId } from 'react'

import { cn } from '@/shared/lib/cn'

type TextareaLook = 'message' | 'form' | 'row'

type TextareaProps = Omit<ComponentPropsWithRef<'textarea'>, 'children'> & {
  /**
   * The visible label. Leave it out only when something else names the textarea: a
   * FieldRow's htmlFor, or aria-labelledby (Message all customers uses its section title).
   */
  label?: string
  hideLabel?: boolean
  /**
   * 12 px muted line, linked with aria-describedby. The message look shows it above the
   * box, as drawn ("Sent by email and shown in the app"); the others below.
   */
  help?: ReactNode
  /** Wording from messages.ts. Sets aria-invalid and an orange border. */
  error?: string
  /**
   * message: 4 rows, 12 px padding (Message all customers). form (default): 2 rows (Note
   * in Record payment). row: 2 rows, 8 px corners, resizable (Payment instructions).
   */
  look?: TextareaLook
}

// UI kit spec §3.4: AdminSchedule.dc.html:233-234, AdminStudents.dc.html:304-305,
// AdminSettings.dc.html:50, 195. maxLength (a native prop) stops typing past the limits.
const looks: Record<TextareaLook, string> = {
  message: 'rounded-control p-3 resize-none',
  form: 'rounded-control px-3 py-2.5 resize-none',
  row: 'rounded-small px-3 py-2.5 resize-y',
}

const defaultRows: Record<TextareaLook, number> = { message: 4, form: 2, row: 2 }

/** A labelled multi-line input (UI kit spec §3.4). Ids work as in Field. */
export function Textarea({
  label,
  hideLabel = false,
  help,
  error,
  look = 'form',
  rows,
  id: idProp,
  className,
  'aria-describedby': describedByProp,
  'aria-invalid': ariaInvalid,
  onFocus,
  ...rest
}: TextareaProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy = cn(describedByProp, help ? helpId : null, error && errorId) || undefined
  const invalid = Boolean(error) || ariaInvalid === true || ariaInvalid === 'true'

  const helpText = help ? (
    // The message look's line above the box is one line at the font's own height, as drawn.
    <p id={helpId} className={cn('text-small text-muted', look !== 'message' && 'leading-[1.45]')}>
      {help}
    </p>
  ) : null

  return (
    // The message look sits in a section whose children are 10 px apart (the drawing).
    <div className={cn('flex flex-col', look === 'message' ? 'gap-2.5' : 'gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-label font-medium text-muted'}>
          {label}
        </label>
      )}
      {look === 'message' && helpText}
      <textarea
        {...rest}
        // Browsers bring only the caret's line into view when a box takes focus, which can
        // leave the rest of it and its focus ring under a bar stuck to the bottom of the page
        // or a dialog. Show the whole box, inside the scroll padding that keeps those bars
        // clear (DESIGN §5; WCAG 2.2 2.4.11). jsdom has no scrollIntoView.
        onFocus={(event) => {
          event.currentTarget.scrollIntoView?.({ block: 'nearest' })
          onFocus?.(event)
        }}
        id={id}
        rows={rows ?? defaultRows[look]}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={cn(
          'block w-full border border-field bg-white text-sm leading-[1.45] text-ink aria-[invalid=true]:border-warn disabled:bg-subtle disabled:text-muted read-only:bg-subtle',
          looks[look],
        )}
      />
      {look !== 'message' && helpText}
      {error && (
        <p id={errorId} className="text-label leading-[1.45] text-warn">
          {error}
        </p>
      )}
    </div>
  )
}
