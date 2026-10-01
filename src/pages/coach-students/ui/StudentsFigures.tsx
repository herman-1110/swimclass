import { Figure } from '@/shared/ui/Figure'
import { Skeleton } from '@/shared/ui/Skeleton'

import type { studentsFigures } from '../model/rows'

type StudentsFiguresProps = {
  /** null while the list loads (or failed): grey placeholders. */
  figures: ReturnType<typeof studentsFigures> | null
}

const layout = 'grid grid-cols-3 gap-3 md:flex md:gap-14'

/**
 * Unpaid (orange while there is any), On last lesson, and Students · packages
 * (AdminStudents.dc.html:79-92): three columns on phones, a row 56 px apart from 768 px.
 */
export function StudentsFigures({ figures }: StudentsFiguresProps) {
  if (!figures) {
    return (
      <div aria-hidden="true" className={layout}>
        {[0, 1, 2].map((index) => (
          // As tall as a figure: a 28.8 px number (24 px × 1.2), then the caption, two 15 px
          // lines in a phone's three columns and one from 768 px.
          <div key={index} className="flex flex-col gap-0.5">
            <Skeleton shape="line" className="my-[2.4px] h-6 w-8" />
            <Skeleton shape="line" className="h-3.5 w-full md:h-[15px] md:w-36" />
            <Skeleton shape="line" className="h-3.5 w-2/3 md:hidden" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className={layout}>
      <Figure
        value={figures.unpaid.count}
        caption={figures.unpaid.caption}
        tone={figures.unpaid.count > 0 ? 'warn' : 'ink'}
      />
      <Figure value={figures.lastLesson.count} caption={figures.lastLesson.caption} />
      <Figure value={figures.students.count} caption={figures.students.caption} />
    </div>
  )
}
