import type { ComponentPropsWithRef } from 'react'

import { cn } from '@/shared/lib/cn'

import { buttonClasses, type ButtonLook, buttonMotion } from './buttonClasses'

type ButtonProps = ButtonLook &
  ComponentPropsWithRef<'button'> & {
    /**
     * A request is running: aria-busy, clicks ignored (a submit button doesn't submit
     * again), colours kept, focus kept. The caller changes the label ("Logging in…").
     */
    pending?: boolean
  }

/**
 * Every action (UI kit spec §3.1). A plain button unless the caller passes
 * type="submit" (CLAUDE.md UI rules). The label says what it does and keeps its name
 * through the flow ("Save payment" → "Payment saved", DESIGN §6).
 *
 * Two ways to be unavailable: `disabled` (as drawn for Book's "Pick a time"; the reason
 * must be visible beside it) or `aria-disabled` (Settings' "Save changes": same look, but
 * it keeps focus after a save, and clicks are ignored).
 */
export function Button({
  variant,
  size,
  tone,
  textSize,
  flush,
  weight,
  block,
  pending = false,
  type = 'button',
  className,
  onClick,
  'aria-disabled': ariaDisabled,
  ...rest
}: ButtonProps) {
  const softDisabled = ariaDisabled === true || ariaDisabled === 'true'
  const ignoreClicks = pending || softDisabled

  return (
    <button
      {...rest}
      type={type}
      aria-busy={pending || undefined}
      aria-disabled={ignoreClicks || undefined}
      data-disabled={softDisabled || undefined}
      data-motion={buttonMotion(variant)}
      className={cn(
        buttonClasses({ variant, size, tone, textSize, flush, weight, block }),
        className,
      )}
      onClick={(event) => {
        if (ignoreClicks) {
          // Also stops a submit button (or Enter in a field) from submitting the form.
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
    />
  )
}
