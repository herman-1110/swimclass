import type { ReactNode } from 'react'

type FieldListProps = {
  /** FieldRows. */
  children: ReactNode
}

/**
 * The framed box of setting rows (UI kit spec §3.21, AdminSettings.dc.html:31): 1 px
 * --frame, radius 12, clipped; each FieldRow after the first draws the divider.
 */
export function FieldList({ children }: FieldListProps) {
  return <div className="overflow-hidden rounded-frame border border-frame">{children}</div>
}
