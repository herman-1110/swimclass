import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { type CustomerAccount, usernameAvailableQuery } from '@/entities/account'
import type { CoachSettings } from '@/entities/settings'
import { toAppError } from '@/shared/api/rpc'

import { type CreateAccountInput, useCreateAccount } from '../api/useCreateAccount'
import { useCreateGroup } from '../api/useCreateGroup'
import { readAmount, readLessons } from '../model/amount'
import { accountErrorField, groupErrorField } from '../model/errorPlacement'
import { problemAt } from '../model/fields'
import { studentItems } from '../model/students'
import type { AddedResult, Problems } from '../model/types'
import { validate } from '../model/validate'
import { EMPTY_NEW_ACCOUNT, useAddStudentsDraft } from './useAddStudentsDraft'

/** The account this visit created: Add then only adds the group (the spec §5.2.2, step 4). */
type CreatedAccount = { id: string; name: string; email: string }

type UseAddStudentsOptions = {
  settings: CoachSettings
  accounts: readonly CustomerAccount[]
  initialAccountId?: string
  onAdded: (result: AddedResult) => void
}

/**
 * The Add students form and its save (the spec §5): checked first in the browser, then
 * create_account when the account is new, then create_group. A refusal shows at its field
 * and takes focus there. Once the account exists, Add only adds the group, so a retry never
 * makes a second account.
 */
export function useAddStudents({
  settings,
  accounts,
  initialAccountId,
  onAdded,
}: UseAddStudentsOptions) {
  const queryClient = useQueryClient()
  const running = useRef(false)
  const form = useAddStudentsDraft({ settings, accounts, initialAccountId })
  const [created, setCreated] = useState<CreatedAccount | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const createAccount = useCreateAccount()
  const createGroup = useCreateGroup()
  const { draft, username, account, isNew, rows, size, show } = form
  const saving = createAccount.isPending || createGroup.isPending || checkingUsername

  async function usernameTaken(): Promise<boolean> {
    if (username.state === 'taken') return true
    if (username.state === 'available') return false
    // Still checking, or the check failed: ask now. If it can't tell, the Edge Function
    // checks again and refuses with username_taken.
    setCheckingUsername(true)
    try {
      return !(await queryClient.fetchQuery(usernameAvailableQuery(username.username)))
    } catch {
      return false
    } finally {
      setCheckingUsername(false)
    }
  }

  async function save(found: Problems) {
    if (isNew && found.newUsername === undefined && (await usernameTaken())) {
      found.newUsername = { code: 'username_taken' }
    }
    if (Object.keys(found).length > 0) return show(found)
    form.setProblems({})

    let accountId = form.accountId
    let invitedEmail = created !== null && created.id === account ? created.email : undefined
    if (isNew) {
      const input: CreateAccountInput = {
        username: username.username,
        displayName: draft.newAccount.name.trim(),
        email: draft.newAccount.email.trim(),
        phone: draft.newAccount.phone.trim() || null,
      }
      try {
        accountId = await createAccount.mutateAsync(input)
      } catch (error) {
        return show(problemAt(accountErrorField(error), toAppError(error)))
      }
      setCreated({ id: accountId, name: input.displayName, email: input.email })
      form.setDraft((current) => ({
        ...current,
        account: accountId,
        newAccount: EMPTY_NEW_ACCOUNT,
      }))
      invitedEmail = input.email
    }
    if (accountId === null) return

    const cents = readAmount(form.amount)
    try {
      const groupId = await createGroup.mutateAsync({
        accountId,
        students: studentItems(rows),
        location: draft.location.trim(),
        firstPackagePaid: draft.paid,
        amountCents: draft.paid && typeof cents === 'number' ? cents : null,
        method: draft.paid ? draft.method : null,
        openingUsed: draft.openingOpen ? readLessons(draft.openingUsed) : 0,
        openingPaid: draft.openingOpen ? readLessons(draft.openingPaid) : 0,
      })
      onAdded({ groupId, size, invitedEmail })
    } catch (error) {
      const visible = { size, paid: draft.paid, openingOpen: draft.openingOpen }
      show(problemAt(groupErrorField(error, visible), toAppError(error)))
    }
  }

  /**
   * Add (or Enter in a field). Problems the form finds itself show at once; anything that
   * calls out runs one at a time, so a double press never sends twice.
   */
  function submit() {
    if (running.current || saving || form.studentsMissing) return
    const found = validate({
      account,
      newAccount: draft.newAccount,
      usernameState: username.state,
      rows,
      location: draft.location,
      paid: draft.paid,
      amount: form.amount,
      priceCents: form.priceCents,
      method: draft.method,
    })
    // A username still being checked is asked about before anything is sent.
    const asksFirst = isNew && found.newUsername === undefined && username.state !== 'available'
    if (Object.keys(found).length > 0 && !asksFirst) return show(found)
    running.current = true
    void save(found).finally(() => {
      running.current = false
    })
  }

  return {
    ...form,
    submit,
    saving,
    /** "Account created for {name}." while the account this visit created is chosen. */
    createdName: created !== null && created.id === account ? created.name : null,
  }
}
