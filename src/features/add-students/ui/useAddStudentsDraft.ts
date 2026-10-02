import { useState } from 'react'
import { flushSync } from 'react-dom'

import { type CustomerAccount, useAccountStudents, useUsernameAvailable } from '@/entities/account'
import { type CoachSettings, packagePriceCents } from '@/entities/settings'
import { useReadFailure } from '@/shared/lib/hooks/useReadFailure'

import { chosenAccount } from '../model/account'
import { amountPrefill } from '../model/amount'
import { FIELD_IDS, firstProblem, focusSelector, withoutProblems } from '../model/fields'
import { resolveStudents } from '../model/students'
import {
  type FieldKey,
  NEW_ACCOUNT,
  type NewAccountDraft,
  type PaidBy,
  type Problems,
} from '../model/types'

/** What the coach has typed and chosen. */
export type AddStudentsDraft = {
  /** null until the coach picks one: the default then applies (chosenAccount). */
  account: string | null
  newAccount: NewAccountDraft
  /** The chosen lesson type; above the students per lesson it shows as the maximum. */
  size: number
  /** Every row's text, also rows hidden by a smaller type (switching back restores them). */
  rows: readonly string[]
  location: string
  paid: boolean
  /** null until the coach types an amount: it follows the type's price until then. */
  amount: string | null
  method: PaidBy
  openingOpen: boolean
  openingUsed: string
  openingPaid: string
}

export const EMPTY_NEW_ACCOUNT: NewAccountDraft = { name: '', username: '', email: '', phone: '' }

/** Student rows kept: the most a lesson can take (settings allow 1 to 3, CLAUDE.md rule 5). */
const ROWS = 3

/** Where focus goes once "Try again" has brought the chosen account's students. */
const accountSelect = () => document.getElementById(FIELD_IDS.account)

// The spec C1: 1-to-1 (10 of the 13 seed groups), no account chosen (C2), Cash (as drawn).
const START: AddStudentsDraft = {
  account: null,
  newAccount: EMPTY_NEW_ACCOUNT,
  size: 1,
  rows: Array.from({ length: ROWS }, () => ''),
  location: '',
  paid: false,
  amount: null,
  method: 'cash',
  openingOpen: false,
  openingUsed: '',
  openingPaid: '',
}

const NEW_ACCOUNT_KEYS: Record<keyof NewAccountDraft, FieldKey> = {
  name: 'newName',
  username: 'newUsername',
  email: 'newEmail',
  phone: 'newPhone',
}

/** Every student row's problem key: student-1 … student-{count}. */
function rowKeys(count: number): FieldKey[] {
  return Array.from({ length: count }, (_, i): FieldKey => `student-${i + 1}`)
}

type UseAddStudentsDraftOptions = {
  settings: CoachSettings
  accounts: readonly CustomerAccount[]
  initialAccountId?: string
}

/**
 * The Add students form as typed, what follows from it (the chosen account and its
 * students matched to the rows, the price, the amount), and the problems on show. Each
 * change takes away the problems it may have fixed.
 */
export function useAddStudentsDraft({
  settings,
  accounts,
  initialAccountId,
}: UseAddStudentsDraftOptions) {
  const [draft, setDraft] = useState(START)
  const [problems, setProblems] = useState<Problems>({})
  const [attempt, setAttempt] = useState(0)

  const max = settings.max_students_per_lesson
  const size = Math.min(draft.size, max)
  const account = chosenAccount(draft.account, accounts, initialAccountId)
  const isNew = account === NEW_ACCOUNT
  const accountId = account !== '' && !isNew ? account : null
  const students = useAccountStudents(accountId)
  const known = accountId === null ? [] : (students.data ?? [])
  const texts = draft.rows.slice(0, size)
  const rows = resolveStudents(texts, known)
  const username = useUsernameAvailable(isNew ? draft.newAccount.username : '')
  const priceCents = packagePriceCents(settings, size)
  // Add waits for the account's students: without them a typed "Sofia" would be sent as a
  // new student, a duplicate (the spec §5.3). Students already read stay good enough while
  // a later refresh fails.
  const studentsMissing = accountId !== null && students.data === undefined
  // They never loaded: the problem and "Try again" under Account, kept while they are read
  // again; focus then goes back to Account.
  const studentsFailure = useReadFailure([students], accountSelect)

  /**
   * Changes the draft from its latest state (autofill can change several fields at once);
   * the fields in `clears` lose their problems.
   */
  function edit(
    patch: (current: AddStudentsDraft) => Partial<AddStudentsDraft>,
    ...clears: FieldKey[]
  ) {
    setDraft((current) => ({ ...current, ...patch(current) }))
    if (clears.length > 0) setProblems((current) => withoutProblems(current, clears))
  }

  /** Shows the problems and moves focus to the first, centred above the tab bar (§2.5). */
  function show(found: Problems) {
    flushSync(() => {
      setProblems(found)
      // A new alert each time, so the same problem is read out again after another try.
      setAttempt((count) => count + 1)
    })
    const selector = focusSelector(firstProblem(found, size) ?? 'form')
    const target = selector ? document.querySelector<HTMLElement>(selector) : null
    if (!target) return
    target.focus({ preventScroll: true })
    // jsdom has no scrolling.
    if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'center' })
  }

  const change = {
    // Another account's students match differently: the rows' problems go too.
    account: (value: string) =>
      edit(() => ({ account: value }), 'account', 'students', 'form', ...rowKeys(ROWS)),
    newAccount: (field: keyof NewAccountDraft, value: string) =>
      edit(
        (current) => ({ newAccount: { ...current.newAccount, [field]: value } }),
        NEW_ACCOUNT_KEYS[field],
      ),
    // Rows the new type hides lose their problems: they aren't sent.
    type: (value: string) =>
      edit(
        () => ({ size: Number(value) }),
        'type',
        'students',
        ...rowKeys(ROWS).slice(Number(value)),
      ),
    row: (index: number, text: string) =>
      edit(
        (current) => ({ rows: current.rows.map((row, i) => (i === index - 1 ? text : row)) }),
        `student-${index}`,
        'students',
      ),
    location: (value: string) => edit(() => ({ location: value }), 'location'),
    paid: (paid: boolean) => edit(() => ({ paid }), 'amount', 'method'),
    amount: (value: string) => edit(() => ({ amount: value }), 'amount'),
    method: (method: PaidBy) => edit(() => ({ method }), 'method'),
    // Opening or closing starts again at 0: nothing hidden is sent (the spec §5.3).
    opening: () =>
      edit(
        (current) => ({ openingOpen: !current.openingOpen, openingUsed: '', openingPaid: '' }),
        'openingUsed',
      ),
    openingUsed: (value: string) => edit(() => ({ openingUsed: value }), 'openingUsed'),
    openingPaid: (value: string) => edit(() => ({ openingPaid: value }), 'openingUsed'),
  }

  return {
    draft,
    setDraft,
    change,
    problems,
    setProblems,
    show,
    attempt,
    max,
    size,
    account,
    isNew,
    accountId,
    known,
    texts,
    rows,
    username,
    priceCents,
    /** The Amount field's text: the type's price until the coach types their own. */
    amount: draft.amount ?? amountPrefill(priceCents),
    studentsMissing,
    /** The chosen account's students couldn't be read: show it, with Try again. */
    studentsFailure: accountId === null ? null : studentsFailure,
  }
}
