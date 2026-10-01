import { useId, useState } from 'react'
import { Link } from 'react-router'

import { messageParts } from '@/shared/config/messages'
import { ROUTES } from '@/shared/config/routes'
import { Button } from '@/shared/ui/Button'

import { useSetGroupActive } from '../api/useSetGroupActive'
import { DEACTIVATE_GROUP, GROUP_REACTIVATED, REACTIVATE_GROUP } from '../model/copy'
import type { EditableGroup } from '../model/types'
import { DeactivateGroupDialog } from './DeactivateGroupDialog'

type GroupActiveButtonProps = {
  group: Pick<EditableGroup, 'group_id' | 'display_names' | 'active'>
  /** Deactivated or reactivated: show this notice in the History drawer. */
  onChanged?: (notice: string) => void
}

/**
 * The History drawer's "Deactivate group" (with a confirmation) or "Reactivate group" (at
 * once): a quiet button (coach-add-students §2.7, §5.2.3). One button, so focus stays on it
 * when the group flips. A refused reactivation (`duplicate_group`) shows under it, with "that
 * group" linking to the group that already has these students.
 */
export function GroupActiveButton({ group, onChanged }: GroupActiveButtonProps) {
  const errorId = useId()
  const [confirming, setConfirming] = useState(false)
  const reactivate = useSetGroupActive()
  const pending = reactivate.isPending

  const press = () => {
    if (group.active) {
      reactivate.reset()
      setConfirming(true)
      return
    }
    reactivate.mutate(
      { groupId: group.group_id, active: true },
      { onSuccess: () => onChanged?.(GROUP_REACTIVATED) },
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="quiet"
        size="sm"
        // Its words line up with the text of the drawer's group block (and "Edit group").
        className="-ml-3.5"
        aria-haspopup={group.active ? 'dialog' : undefined}
        pending={pending}
        aria-disabled={pending || undefined}
        aria-describedby={reactivate.isError ? errorId : undefined}
        onClick={press}
      >
        {group.active ? DEACTIVATE_GROUP : REACTIVATE_GROUP}
      </Button>
      {reactivate.isError && (
        <p id={errorId} role="alert" className="text-label leading-normal text-warn">
          {messageParts(reactivate.error, { audience: 'coach' }).map((part) =>
            typeof part === 'string' ? (
              part
            ) : (
              // Underlined: accent beside the warn words is too close a colour to mark a link.
              <Link
                key={part.groupId}
                to={`${ROUTES.coachStudents}?history=${part.groupId}`}
                preventScrollReset
                className="underline underline-offset-[3px]"
              >
                {part.text}
              </Link>
            ),
          )}
        </p>
      )}
      {confirming && (
        <DeactivateGroupDialog
          group={group}
          onClose={() => setConfirming(false)}
          onDeactivated={(notice) => {
            setConfirming(false)
            onChanged?.(notice)
          }}
        />
      )}
    </div>
  )
}
