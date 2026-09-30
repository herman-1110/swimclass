import { Link } from 'react-router'

import { ChevronLeftIcon } from '@/shared/ui/icons/ChevronLeftIcon'

type BackLinkProps = {
  /** A path from ROUTES. */
  to: string
  /** Where it goes: "Students & payments". */
  children: string
}

/**
 * A link back to the page above, with a left chevron (UI kit spec §3.31,
 * AdminAddStudents.dc.html:55-58). It sits at the start of a column.
 */
export function BackLink({ to, children }: BackLinkProps) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center gap-1.5 self-start text-label font-semibold text-accent hover:text-accent-hover"
    >
      <ChevronLeftIcon size={16} strokeWidth={1.8} />
      {children}
    </Link>
  )
}
