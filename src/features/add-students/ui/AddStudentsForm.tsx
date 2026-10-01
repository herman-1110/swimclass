import { useCustomerAccounts } from '@/entities/account'
import { useCoachSettings } from '@/entities/settings'
import { messageFor } from '@/shared/config/messages'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'

import type { AddedResult } from '../model/types'
import { AddStudentsEditor } from './AddStudentsEditor'
import { AddStudentsSkeleton } from './AddStudentsSkeleton'

type AddStudentsFormProps = {
  /** `?account=`: that account is chosen at first when it is in the list (the spec §1). */
  initialAccountId?: string
  /** The group exists and the data is fresh: the page moves on (Students & payments). */
  onAdded: (result: AddedResult) => void
}

/**
 * Add students' whole grid (AdminAddStudents.dc.html:62-122): the form, the customer
 * preview and the buttons, which share their state. It reads the settings (students per
 * lesson, lessons per package, prices) and the customer accounts first: grey blocks until
 * they arrive, or the problem with "Try again" in place of the form.
 */
export function AddStudentsForm({ initialAccountId, onAdded }: AddStudentsFormProps) {
  const settings = useCoachSettings()
  const accounts = useCustomerAccounts()

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

  const failed = settings.isError ? settings.error : accounts.isError ? accounts.error : null
  if (failed === null) return <AddStudentsSkeleton />

  return (
    <Banner
      role="alert"
      className="md:max-w-150"
      action={
        <Button
          variant="link"
          onClick={() => {
            if (settings.isError) void settings.refetch()
            if (accounts.isError) void accounts.refetch()
          }}
        >
          Try again
        </Button>
      }
    >
      {messageFor(failed, { audience: 'coach' })}
    </Banner>
  )
}
