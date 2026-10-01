import { ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { ButtonLink } from '@/shared/ui/ButtonLink'

import { FIELD_IDS } from '../model/fields'

type AddStudentsActionsProps = {
  /** "Add student" / "Add 3 students" (saveLabel): the same through the whole flow. */
  label: string
  /** A save is running: busy, and pressing again does nothing. */
  saving: boolean
  /** Nothing can be saved yet (the page is loading, or the account's students are). */
  unavailable: boolean
  /** A problem that belongs to no field, above the buttons. */
  error?: string
  /** Counts the presses of Add, so the same problem is read out again after another try. */
  attempt?: number
  /** Grid placement. */
  className?: string
}

/**
 * Add and Cancel (AdminAddStudents.dc.html:117-121): Add fills the row on phones and takes
 * its own width from 768 px; Cancel goes back to Students & payments. While a save runs, or
 * while nothing can be saved yet, Add keeps its label and focus, looks disabled and ignores
 * presses, so nothing is sent twice (the spec §6).
 */
export function AddStudentsActions({
  label,
  saving,
  unavailable,
  error,
  attempt = 0,
  className,
}: AddStudentsActionsProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {error && (
        <p
          key={attempt}
          id={`${FIELD_IDS.form}-error`}
          role="alert"
          className="text-label leading-[1.45] text-warn"
        >
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          className="flex-1 md:flex-none"
          pending={saving}
          aria-disabled={saving || unavailable || undefined}
        >
          {label}
        </Button>
        <ButtonLink to={ROUTES.coachStudents} variant="text" weight="medium">
          Cancel
        </ButtonLink>
      </div>
    </div>
  )
}
