import type { ReactNode } from 'react'

import { accountOptionLabel, type CustomerAccount } from '@/entities/account'
import { messageFor } from '@/shared/config/messages'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'
import { Select, type SelectOption } from '@/shared/ui/Select'

import { FIELD_IDS } from '../model/fields'
import { NEW_ACCOUNT } from '../model/types'

type AccountFieldProps = {
  accounts: readonly CustomerAccount[]
  /** '' (none chosen yet), NEW_ACCOUNT, or a profile id. */
  value: string
  onChange: (value: string) => void
  error?: string
  /** "Account created for Siti Rahman." while the account this visit created is chosen. */
  notice: string | null
  /** The chosen account's students failed to load: their error, and how to ask again. */
  studentsError: { error: unknown; retry: () => void } | null
  /** The New account fields, while "Create a new account…" is chosen. */
  children?: ReactNode
}

const STATUS_ID = `${FIELD_IDS.account}-status`

/**
 * Account (AdminAddStudents.dc.html:64-73): the approved customer accounts as
 * "Mei Ling · meiling" after a "Choose an account" placeholder (the spec C2, C17), then
 * "Create a new account…", which opens the New account fields right under the help.
 */
export function AccountField({
  accounts,
  value,
  onChange,
  error,
  notice,
  studentsError,
  children,
}: AccountFieldProps) {
  const options: SelectOption[] = [
    { value: '', label: 'Choose an account', disabled: true },
    ...accounts.map((account) => ({ value: account.id, label: accountOptionLabel(account) })),
    { value: NEW_ACCOUNT, label: 'Create a new account…' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Select
          id={FIELD_IDS.account}
          label="Account"
          options={options}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          help="The person who books and pays. A new account gets an email to set its password."
          error={error}
          aria-describedby={notice ? STATUS_ID : undefined}
        />
        {/* Always in the page, so the notice is read out when it appears; while empty it
            takes no room (the negative margin cancels the gap above it). */}
        <p
          id={STATUS_ID}
          role="status"
          className="text-small leading-[1.45] text-muted empty:-mt-1.5"
        >
          {notice}
        </p>
      </div>
      {studentsError && (
        <Banner
          role="alert"
          action={
            <Button variant="link" onClick={studentsError.retry}>
              Try again
            </Button>
          }
        >
          {messageFor(studentsError.error, { audience: 'coach' })}
        </Banner>
      )}
      {children}
    </div>
  )
}
