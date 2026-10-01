import { useId, useState } from 'react'

import { type PinnedAnnouncement, usePinnedAnnouncements } from '@/entities/announcement'
import { Button } from '@/shared/ui/Button'
import { SectionLabel } from '@/shared/ui/SectionLabel'

import { pinnedLine, removeMessageName } from '../model/copy'
import { RemoveMessageConfirm } from './RemoveMessageConfirm'

type PinnedMessagesProps = {
  /** A message was removed: show this notice ("Message removed."). Its row is gone. */
  onRemoved?: (notice: string) => void
}

/**
 * Every pinned message not yet removed, newest first, each with Remove (prompt 08 TASK 3;
 * the Schedule spec §3.7, proposed look): the message, then "Posted Sat 26 Sep · Customers
 * see this one" for the newest (the banner customers see) and "… · Shows again if you remove
 * the newer ones" for the others. Nothing while there are none, while loading or after a
 * failed read: the form above still works (§6.2).
 */
export function PinnedMessages({ onRemoved }: PinnedMessagesProps) {
  const pinned = usePinnedAnnouncements()
  const [removing, setRemoving] = useState<PinnedAnnouncement | null>(null)
  const labelId = useId()

  if (!pinned.data || pinned.data.length === 0) return null

  return (
    <div className="mt-2 flex flex-col">
      <SectionLabel as="h3" id={labelId}>
        Pinned messages
      </SectionLabel>
      <ul role="list" aria-labelledby={labelId} className="m-0 flex list-none flex-col p-0">
        {pinned.data.map((announcement, index) => (
          <li
            key={announcement.id}
            className="flex items-start justify-between gap-3 border-b border-line py-3 last:border-b-0"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm leading-[1.45] break-words whitespace-pre-wrap">
                {announcement.message}
              </p>
              <p className="text-small text-muted">
                {pinnedLine(announcement.created_at, index === 0)}
              </p>
            </div>
            <Button
              variant="link"
              textSize="label"
              aria-haspopup="dialog"
              className="-mt-3 shrink-0"
              onClick={() => setRemoving(announcement)}
            >
              {/* The space stays outside the hidden part, so every browser keeps it. */}
              <span>
                Remove <span className="sr-only">{removeMessageName(announcement.created_at)}</span>
              </span>
            </Button>
          </li>
        ))}
      </ul>
      {removing && (
        <RemoveMessageConfirm
          announcement={removing}
          onClose={() => setRemoving(null)}
          onRemoved={(notice) => {
            setRemoving(null)
            onRemoved?.(notice)
          }}
        />
      )}
    </div>
  )
}
