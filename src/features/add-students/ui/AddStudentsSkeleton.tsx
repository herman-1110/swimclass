import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/Skeleton'

import { saveLabel } from '../model/copy'
import { AddStudentsActions } from './AddStudentsActions'
import { LabelledBlockSkeleton } from './LabelledBlockSkeleton'
import { ACTIONS_AREA, FORM_AREA, GRID, PREVIEW_AREA } from './layout'

/**
 * The form while settings and accounts load (the spec §6): grey blocks at the real heights
 * (Account and its help, the 50 px track, one student row, Pool location, the 44 px
 * checkbox row, the 44 px link), the preview's frame with a 48 px row, and Add looking
 * disabled. The header and the back link are the page's, so they show at once.
 */
export function AddStudentsSkeleton() {
  return (
    <div className={GRID} aria-busy="true">
      <p role="status" className="sr-only">
        Loading…
      </p>
      <div className={FORM_AREA}>
        <LabelledBlockSkeleton control="h-11.5" help="w-96" />
        <LabelledBlockSkeleton control="h-12.5" help="w-64" />
        <LabelledBlockSkeleton control="h-11.5" />
        <LabelledBlockSkeleton control="h-11.5" />
        <div className="flex flex-col gap-0.5">
          <Skeleton shape="line" className="my-3.5 h-4 w-52" />
          <Skeleton shape="line" className="ml-7 h-3 w-48" />
        </div>
        <div className="flex flex-col">
          <Skeleton shape="line" className="my-3.5 h-4 w-40" />
          <Skeleton shape="line" className="h-3 w-80 max-w-full" />
        </div>
      </div>
      <Card as="div" className={cn('flex flex-col gap-3', PREVIEW_AREA)}>
        <Skeleton shape="line" className="h-4 w-56 max-w-full" />
        <Skeleton className="h-12" />
      </Card>
      <AddStudentsActions
        label={saveLabel(1)}
        saving={false}
        unavailable
        className={ACTIONS_AREA}
      />
    </div>
  )
}
