import type { ReactNode } from 'react'

import { Card } from './Card'

type EmptyStateProps = {
  /** An optional 15 px heading line: "No students yet". */
  title?: string
  /** The message, from DESIGN §6: "Your coach hasn’t set up your lessons yet. …". */
  children: ReactNode
  /** A next step: a link-look Button or ButtonLink ("Add students", "Clear search"). */
  action?: ReactNode
  /** In a Card with 20 px padding, when it stands in for a whole section. */
  framed?: boolean
}

/**
 * What a section shows when it has nothing to list (UI kit spec §3.23; not drawn, so the
 * look is the minimal proposal: muted text, then the action).
 */
export function EmptyState({ title, children, action, framed = false }: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-start gap-2">
      {title && <p className="text-body font-semibold">{title}</p>}
      <p className="text-sm leading-normal text-muted">{children}</p>
      {action}
    </div>
  )

  return framed ? <Card>{content}</Card> : content
}
