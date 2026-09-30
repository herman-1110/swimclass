import { Skeleton } from '@/shared/ui/Skeleton'

/**
 * PackageSummary's place while the balance loads: the title, the 4 px bar and the counts
 * (book spec §6.1, my-classes spec §6). Hidden from screen readers: the loading region
 * carries aria-busy and its own "Loading…" status.
 */
export function PackageSummarySkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton shape="line" className="h-4.5 w-36" />
      <Skeleton shape="line" className="h-1 w-full" />
      <Skeleton shape="line" className="h-4 w-52 max-w-full" />
    </div>
  )
}
