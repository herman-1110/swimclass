import { Skeleton } from '@/shared/ui/Skeleton'

/** The Record payment form's placeholders while the list or the prices load. */
export function PanelSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4.5">
      {['w-16', 'w-16', 'w-14', 'w-18', 'w-28'].map((width, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <Skeleton shape="line" className={`h-4 ${width}`} />
          <Skeleton className="h-11.5" />
        </div>
      ))}
      <Skeleton className="h-11.5" />
    </div>
  )
}
