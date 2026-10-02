import type { ComponentPropsWithRef, ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

type IconButtonProps = Omit<ComponentPropsWithRef<'button'>, 'aria-label' | 'children'> & {
  /** Its name for screen readers ("Previous week"): the button shows only the icon. */
  label: string
  /** The icon, hidden from screen readers (the icons in ./icons already are). */
  children: ReactNode
}

/**
 * A 44 px square button with only an icon (design/Schedule.dc.html, the week arrows):
 * no border, radius 10, ink icon. Disabled, or aria-disabled when it must keep focus, it
 * turns the icon --field grey. Under the mouse it gets the quiet buttons' outline and lift
 * (buttonClasses, shared/lib/motion).
 */
export function IconButton({
  label,
  children,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      data-motion="soft"
      className={cn(
        'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control bg-transparent text-ink transition-[background-color,box-shadow] duration-150 hover:bg-subtle hover:shadow-soft',
        'disabled:cursor-default disabled:text-field disabled:hover:bg-transparent disabled:hover:shadow-none',
        'aria-disabled:cursor-default aria-disabled:text-field aria-disabled:hover:bg-transparent aria-disabled:hover:shadow-none',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
