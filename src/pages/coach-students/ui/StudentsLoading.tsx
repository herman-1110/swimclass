import { Skeleton } from '@/shared/ui/Skeleton'
import { Table, type TableColumn } from '@/shared/ui/Table'

const COLUMNS: readonly TableColumn[] = [
  { key: 'students', header: 'Students', width: 'w-50' },
  { key: 'type', header: 'Type', width: 'w-18' },
  { key: 'package', header: 'Package', width: 'w-40' },
  { key: 'status', header: 'Status', width: 'w-[118px]' },
  { key: 'paid', header: 'Last paid', width: 'w-24' },
  { key: 'action', header: 'Action', align: 'end' },
]

// One placeholder row at a real row's height (67 px at 1440: the Package cell is the
// tallest), so nothing jumps when the rows come in.
const placeholderRow = (key: number) => ({
  key: String(key),
  cells: {
    students: (
      <span className="flex flex-col gap-1">
        <Skeleton shape="line" className="h-4 w-20" />
        <Skeleton shape="line" className="h-3 w-36 max-w-full" />
      </span>
    ),
    type: <Skeleton shape="line" className="h-5 w-12" />,
    package: (
      <span className="flex flex-col gap-[5px]">
        <Skeleton shape="line" className="h-4 w-18" />
        <Skeleton shape="line" className="h-1.5 w-[113px]" />
        <Skeleton shape="line" className="h-3.5 w-24" />
      </span>
    ),
    status: <Skeleton shape="line" className="h-5.5 w-16" />,
    paid: (
      <span className="flex flex-col gap-0.5">
        <Skeleton shape="line" className="h-4 w-12" />
        <Skeleton shape="line" className="h-3.5 w-10" />
      </span>
    ),
    action: <Skeleton className="ml-auto h-11 w-32" />,
  },
})

/**
 * The list while it loads (coach-students §6): the table header over five grey rows from
 * 768 px, three grey cards on phones. Hidden from screen readers: the list carries aria-busy
 * and "Loading students and payments".
 */
export function StudentsLoading() {
  return (
    <div aria-hidden="true">
      <div className="max-md:hidden">
        <Table caption="Packages" columns={COLUMNS} rows={[0, 1, 2, 3, 4].map(placeholderRow)} />
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} shape="frame" className="h-[163px]" />
        ))}
      </div>
    </div>
  )
}
