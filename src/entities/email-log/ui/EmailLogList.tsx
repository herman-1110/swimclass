import { EmptyState } from '@/shared/ui/EmptyState'
import { Table, type TableColumn } from '@/shared/ui/Table'

import { emailKindLabel, type EmailStatus, emailStatus, emailWhen } from '../model/describe'
import type { EmailLogRow } from '../model/types'

type EmailLogListProps = {
  /** The emails, newest first (`useEmailLog`). */
  rows: readonly EmailLogRow[]
  /** The id of the heading that names the list ("Email log"). */
  labelledBy?: string
}

const tones: Record<EmailStatus['tone'], string> = {
  ink: 'text-ink',
  muted: 'text-muted',
  warn: 'text-warn',
}

const columns: readonly TableColumn[] = [
  { key: 'when', header: 'When', nowrap: true, width: 'w-[1%]' },
  { key: 'to', header: 'To' },
  { key: 'kind', header: 'Kind', nowrap: true, width: 'w-[1%]' },
  { key: 'status', header: 'Status' },
]

/** Rows carry no id: the time, the address and the kind, plus the place for exact twins. */
const keyOf = (row: EmailLogRow, index: number) =>
  `${row.created_at} ${row.to_email} ${row.kind} ${index}`

/**
 * The email log (the Settings spec §5.7, proposed; not drawn): a table from 768 px with
 * When, To, Kind and Status, and one entry per email on phones (DESIGN §5: tables become
 * cards). Both are rendered and CSS shows one. "No emails yet." when there are none.
 */
export function EmailLogList({ rows, labelledBy }: EmailLogListProps) {
  if (rows.length === 0) return <EmptyState>No emails yet.</EmptyState>

  const described = rows.map((row, index) => ({
    key: keyOf(row, index),
    row,
    when: emailWhen(row),
    kind: emailKindLabel(row.kind),
    status: emailStatus(row),
  }))

  return (
    <>
      <ul
        role="list"
        aria-labelledby={labelledBy}
        className="flex flex-col divide-y divide-line rounded-frame border border-frame px-4 md:hidden"
      >
        {described.map(({ key, row, when, kind, status }) => (
          <li key={key} className="flex min-w-0 flex-col gap-0.5 py-3">
            <span className="text-sm font-semibold">{kind}</span>
            <span className="text-label break-all">{row.to_email}</span>
            <span className="text-small leading-[1.4] text-muted">
              {when} · <span className={tones[status.tone]}>{status.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table
          columns={columns}
          {...(labelledBy ? { labelledBy } : { caption: 'Email log' })}
          rows={described.map(({ key, row, when, kind, status }) => ({
            key,
            cells: {
              when: <span className="text-sm">{when}</span>,
              to: <span className="text-sm break-all">{row.to_email}</span>,
              kind: <span className="text-sm">{kind}</span>,
              status: <span className={`text-sm ${tones[status.tone]}`}>{status.text}</span>,
            },
          }))}
        />
      </div>
    </>
  )
}
