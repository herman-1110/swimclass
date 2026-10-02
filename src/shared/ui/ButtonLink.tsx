import type { ComponentPropsWithRef } from 'react'
import { Link } from 'react-router'

import { cn } from '@/shared/lib/cn'

import { buttonClasses, type ButtonLook, buttonMotion } from './buttonClasses'

type ButtonLinkProps = ButtonLook & ComponentPropsWithRef<typeof Link>

/**
 * Navigation that looks like a button (UI kit spec §3.1): "Add students", "Log in"-style
 * primaries, "Forgot username or password?", "New here? Create an account". It is React
 * Router's Link, so it goes somewhere; actions use Button.
 */
export function ButtonLink({
  variant,
  size,
  tone,
  textSize,
  flush,
  weight,
  block,
  className,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      {...rest}
      data-motion={buttonMotion(variant)}
      className={cn(
        buttonClasses({ variant, size, tone, textSize, flush, weight, block }),
        className,
      )}
    />
  )
}
