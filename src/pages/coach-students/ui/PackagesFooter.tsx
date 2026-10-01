import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'

import { footerCaption } from '../model/rows'

type PackagesFooterProps = {
  /** The rows under the current tab and search. */
  count: number
  /** Which layout hides rows, so "Show all" shows only there. */
  hiding: { cards: boolean; table: boolean }
  onShowAll: () => void
}

/**
 * "Needs action first · 13 packages" and "Show all" (AdminStudents.dc.html:263-266). Both
 * layouts are in the page, so "Show all" shows at the widths whose layout hides rows.
 */
export function PackagesFooter({ count, hiding, onShowAll }: PackagesFooterProps) {
  const showAllAt = hiding.cards
    ? hiding.table
      ? undefined
      : 'md:hidden'
    : hiding.table
      ? 'max-md:hidden'
      : null
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 text-label text-muted">
      <span>{footerCaption(count)}</span>
      {showAllAt !== null && (
        <Button
          variant="link"
          textSize="label"
          // Focused, it scrolls clear of the tab bar below 1024 px, like the row actions.
          className={cn(showAllAt, 'scroll-mb-24 lg:scroll-mb-0')}
          onClick={onShowAll}
        >
          Show all
        </Button>
      )}
    </div>
  )
}
