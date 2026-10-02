import { useCustomerAccounts } from '@/entities/account'
import { useCoachSettings } from '@/entities/settings'
import { useReadFailure } from '@/shared/lib/hooks/useReadFailure'

import { FIELD_IDS } from '../model/fields'
import type { AddedResult } from '../model/types'
import { AddStudentsEditor } from './AddStudentsEditor'
import { AddStudentsSkeleton } from './AddStudentsSkeleton'
import { ReadError } from './ReadError'

type AddStudentsFormProps = {
  /** `?account=`: that account is chosen at first when it is in the list (the spec §1). */
  initialAccountId?: string
  /** The group exists and the data is fresh: the page moves on (Students & payments). */
  onAdded: (result: AddedResult) => void
}

/** The form's first field: focus goes there once "Try again" has brought the form. */
const accountSelect = () => document.getElementById(FIELD_IDS.account)

/**
 * Add students' whole grid (AdminAddStudents.dc.html:62-122): the form, the customer
 * preview and the buttons, which share their state. It reads the settings (students per
 * lesson, lessons per package, prices) and the customer accounts first: grey blocks until
 * they arrive, or the problem with "Try again" in place of the form. The problem stays while
 * they are read again, so "Try again" keeps focus.
 */
export function AddStudentsForm({ initialAccountId, onAdded }: AddStudentsFormProps) {
  const settings = useCoachSettings()
  const accounts = useCustomerAccounts()
  const failure = useReadFailure([settings, accounts], accountSelect)

  // Data read once stays on screen even if a later refresh fails, so typing is never lost.
  if (settings.data && accounts.data) {
    return (
      <AddStudentsEditor
        settings={settings.data}
        accounts={accounts.data}
        initialAccountId={initialAccountId}
        onAdded={onAdded}
      />
    )
  }
  if (failure) return <ReadError className="md:max-w-150" failure={failure} />
  return <AddStudentsSkeleton />
}
