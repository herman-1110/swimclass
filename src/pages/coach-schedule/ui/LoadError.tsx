import { type RefObject, useLayoutEffect, useRef } from 'react'

import { messageFor } from '@/shared/config/messages'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'

type LoadErrorProps = {
  /** The failed read's error (an AppError). */
  error: unknown
  /** Reads it again. */
  onRetry: () => void
  /**
   * What holds this message and shows the read in its place (focusable: tabIndex -1).
   * "Try again" goes with the message as soon as the read is asked again, so focus moves
   * there instead of falling to the page.
   */
  focusAfter: RefObject<HTMLElement | null>
}

/**
 * A read that failed, in place of what it would show (the Schedule spec §6.1, §6.2): the
 * network or generic words (DESIGN §6) and a quiet "Try again".
 */
export function LoadError({ error, onRetry, focusAfter }: LoadErrorProps) {
  const box = useRef<HTMLDivElement>(null)

  // It goes while still in the page (React runs this before removing it): if its button
  // has focus, hand focus on before the browser drops it. The target holds this message,
  // so it is there from the start.
  useLayoutEffect(() => {
    const node = box.current
    const target = focusAfter.current
    return () => {
      if (node?.contains(document.activeElement)) target?.focus()
    }
  }, [focusAfter])

  return (
    <Banner
      ref={box}
      role="alert"
      action={
        <Button variant="quiet" size="sm" tone="accent" onClick={onRetry}>
          Try again
        </Button>
      }
    >
      {messageFor(error, { audience: 'coach' })}
    </Banner>
  )
}
