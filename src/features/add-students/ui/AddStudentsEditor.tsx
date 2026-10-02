import type { KeyboardEvent } from 'react'

import { type CustomerAccount, USERNAME_CHECK_DELAY_MS } from '@/entities/account'
import { useGroupLocations } from '@/entities/group'
import type { CoachSettings } from '@/entities/settings'
import { messageFor, messageParts } from '@/shared/config/messages'
import { cn } from '@/shared/lib/cn'
import { useDebouncedValue } from '@/shared/lib/hooks/useDebouncedValue'
import { Segmented } from '@/shared/ui/Segmented'

import {
  accountCreatedNotice,
  packageLine,
  saveLabel,
  studentsPerLessonHelp,
  typeOptions,
} from '../model/copy'
import { FIELD_IDS } from '../model/fields'
import { previewNames } from '../model/students'
import type { AddedResult, FieldKey } from '../model/types'
import { usernameStatus } from '../model/usernameStatus'
import { AccountField } from './AccountField'
import { AddStudentsActions } from './AddStudentsActions'
import { CustomerPreview } from './CustomerPreview'
import { FirstPackageField } from './FirstPackageField'
import { ACTIONS_AREA, FORM_AREA, GRID, PREVIEW_AREA } from './layout'
import { LocationField } from './LocationField'
import { NewAccountFields } from './NewAccountFields'
import { StartingBalanceField } from './StartingBalanceField'
import { StudentRows } from './StudentRows'
import { useAddStudents } from './useAddStudents'

type AddStudentsEditorProps = {
  settings: CoachSettings
  accounts: readonly CustomerAccount[]
  initialAccountId?: string
  onAdded: (result: AddedResult) => void
}

// The drawn inputs have no arrow at the right: Chrome adds one to an input with suggestions
// (Students, Pool location) on hover and focus, shown through its own inline style, so only
// an !important rule hides it. The suggestions still come as they type.
const NO_SUGGESTION_ARROW = '[&_input::-webkit-calendar-picker-indicator]:hidden!'

/**
 * Enter on "First package already paid" or on a Lesson type segment works it, as Space does
 * (the spec §7), rather than adding the group: only Enter in a text field submits.
 */
function enterWorksChoice(event: KeyboardEvent<HTMLFormElement>) {
  const control = event.target
  if (event.key !== 'Enter' || !(control instanceof HTMLInputElement)) return
  if (control.id !== FIELD_IDS.paid && control.name !== FIELD_IDS.type) return
  event.preventDefault()
  // A held-down Enter repeats: it ticks once.
  if (!event.repeat) control.click()
}

/** The form itself, once settings and accounts are in (see AddStudentsForm). */
export function AddStudentsEditor({
  settings,
  accounts,
  initialAccountId,
  onAdded,
}: AddStudentsEditorProps) {
  const form = useAddStudents({ settings, accounts, initialAccountId, onAdded })
  const { draft, change, problems, size, rows } = form
  const locations = useGroupLocations()
  const settledUsername = useDebouncedValue(draft.newAccount.username, USERNAME_CHECK_DELAY_MS)
  const words = (key: FieldKey) => {
    const problem = problems[key]
    return problem ? messageFor(problem, { audience: 'coach' }) : undefined
  }

  return (
    <form
      id={FIELD_IDS.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        form.submit()
      }}
      onKeyDown={enterWorksChoice}
      className={cn(GRID, NO_SUGGESTION_ARROW)}
    >
      <div className={FORM_AREA}>
        <AccountField
          accounts={accounts}
          value={form.account}
          onChange={change.account}
          error={words('account')}
          notice={form.createdName === null ? null : accountCreatedNotice(form.createdName)}
          studentsFailure={form.studentsFailure}
        >
          {form.isNew && (
            <NewAccountFields
              value={draft.newAccount}
              onChange={change.newAccount}
              usernameStatus={usernameStatus(form.username.state, {
                settled: settledUsername === draft.newAccount.username,
                hasError: problems.newUsername !== undefined,
              })}
              errors={{
                name: words('newName'),
                username: words('newUsername'),
                email: words('newEmail'),
                phone: words('newPhone'),
              }}
            />
          )}
        </AccountField>
        <Segmented
          id={FIELD_IDS.type}
          name={FIELD_IDS.type}
          legend="Lesson type"
          options={typeOptions(form.max)}
          value={String(size)}
          onChange={change.type}
          help={studentsPerLessonHelp(form.max)}
          error={words('type')}
        />
        <StudentRows
          texts={form.texts}
          rows={rows}
          onChange={change.row}
          suggestions={[...new Set(form.known.map((student) => student.name))]}
          errors={Object.fromEntries(rows.map((row) => [row.index, words(`student-${row.index}`)]))}
          duplicate={
            problems.students ? messageParts(problems.students, { audience: 'coach' }) : null
          }
        />
        <LocationField
          value={draft.location}
          onChange={change.location}
          suggestions={locations.data ?? []}
          error={words('location')}
        />
        <FirstPackageField
          paid={draft.paid}
          onPaidChange={change.paid}
          packageLine={packageLine(size, settings.lessons_per_package, form.priceCents)}
          amount={form.amount}
          onAmountChange={change.amount}
          method={draft.method}
          onMethodChange={change.method}
          errors={{ amount: words('amount'), method: words('method') }}
        />
        <StartingBalanceField
          open={draft.openingOpen}
          onToggle={change.opening}
          used={draft.openingUsed}
          paid={draft.openingPaid}
          onUsedChange={change.openingUsed}
          onPaidChange={change.openingPaid}
          error={words('openingUsed')}
        />
      </div>
      <CustomerPreview names={previewNames(rows)} size={size} className={PREVIEW_AREA} />
      <AddStudentsActions
        label={saveLabel(size)}
        saving={form.saving}
        unavailable={form.studentsMissing}
        error={words('form')}
        attempt={form.attempt}
        className={ACTIONS_AREA}
      />
    </form>
  )
}
