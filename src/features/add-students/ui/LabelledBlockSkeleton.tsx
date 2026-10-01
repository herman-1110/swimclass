import { cn } from '@/shared/lib/cn'
import { Skeleton } from '@/shared/ui/Skeleton'

type LabelledBlockSkeletonProps = {
  /** The control's height: h-11.5 for a 46 px input or select, h-12.5 for the track. */
  control: string
  /** A 12 px help line under it, as wide as the drawn one. */
  help?: string
}

/** A loading field: a 13 px label over a control and its help, 6 px apart, as the real ones. */
export function LabelledBlockSkeleton({ control, help }: LabelledBlockSkeletonProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton shape="line" className="h-4 w-24" />
      <Skeleton className={control} />
      {help && <Skeleton shape="line" className={cn('h-3 max-w-full', help)} />}
    </div>
  )
}
