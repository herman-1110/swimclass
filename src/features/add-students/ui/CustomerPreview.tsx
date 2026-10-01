import { GroupOptionPreview } from '@/entities/group'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'

import { PREVIEW_NOTE, shareText, showsPreviewNote, typeLabel } from '../model/copy'

type CustomerPreviewProps = {
  /** "Adam, Alya & Amir" (previewNames). */
  names: string
  /** 1, 2 or 3. */
  size: number
  /** Grid placement. */
  className?: string
}

const TITLE_ID = 'add-preview-title'

/**
 * "What the customer sees when booking" (AdminAddStudents.dc.html:108-115): the option row
 * the customer will get on Book, then what sharing a group means. A picture only: nothing in
 * it can be focused.
 */
export function CustomerPreview({ names, size, className }: CustomerPreviewProps) {
  return (
    <Card as="aside" aria-labelledby={TITLE_ID} className={cn('flex flex-col gap-3', className)}>
      <span id={TITLE_ID} className="text-label font-medium text-muted">
        What the customer sees when booking
      </span>
      <GroupOptionPreview names={names} typeLabel={typeLabel(size)} />
      <p className="text-label leading-normal text-ink">{shareText(size)}</p>
      {showsPreviewNote(size) && (
        <p className="text-small leading-normal text-muted">{PREVIEW_NOTE}</p>
      )}
    </Card>
  )
}
