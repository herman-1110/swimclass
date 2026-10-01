import { describe, expect, it } from 'vitest'

import { chosenAccount, defaultAccount } from './account'
import { firstProblem, focusSelector, problemAt, withoutProblems } from './fields'
import { NEW_ACCOUNT } from './types'
import { usernameStatus } from './usernameStatus'

describe('firstProblem', () => {
  it('finds the first field with a problem in page order', () => {
    const problems = {
      location: { code: 'invalid_location' },
      'student-2': { code: 'invalid_name', detail: { index: 2 } },
      newEmail: { code: 'invalid_email' },
    }
    expect(firstProblem(problems, 3)).toBe('newEmail')
    expect(firstProblem({ location: { code: 'invalid_location' } }, 1)).toBe('location')
    expect(firstProblem({ form: { code: 'network' } }, 1)).toBeNull()
  })
})

describe('focusSelector', () => {
  it('enters Lesson type at its first segment, Paid by at its choice, the duplicate at Student 1', () => {
    expect(focusSelector('type')).toBe('input[name="add-type"]')
    expect(focusSelector('method')).toBe('input[name="add-method"]:checked')
    expect(focusSelector('students')).toBe('#add-student-1')
    expect(focusSelector('student-3')).toBe('#add-student-3')
    expect(focusSelector('account')).toBe('#add-account')
    expect(focusSelector('openingUsed')).toBe('#add-opening-used')
    expect(focusSelector('form')).toBeNull()
  })
})

describe('withoutProblems', () => {
  it('drops the edited fields’ problems and keeps the same object when nothing changes', () => {
    const problems = { location: { code: 'invalid_location' }, amount: { code: 'amount_format' } }
    expect(withoutProblems(problems, ['location'])).toEqual({ amount: { code: 'amount_format' } })
    expect(withoutProblems(problems, ['account'])).toBe(problems)
  })

  it('builds a single problem', () => {
    expect(problemAt('type', { code: 'group_full' })).toEqual({ type: { code: 'group_full' } })
  })
})

describe('defaultAccount', () => {
  const accounts = [{ id: 'a2' }, { id: 'a6' }]

  it('starts on the placeholder, or the ?account= one when it is in the list', () => {
    expect(defaultAccount(accounts)).toBe('')
    expect(defaultAccount(accounts, 'a6')).toBe('a6')
    expect(defaultAccount(accounts, 'a99')).toBe('')
  })

  it('opens "Create a new account…" when there are no accounts (the spec §6)', () => {
    expect(defaultAccount([], 'a6')).toBe(NEW_ACCOUNT)
  })
})

describe('chosenAccount', () => {
  const accounts = [{ id: 'a2' }, { id: 'a6' }]

  it('keeps the coach’s choice while it is in the list, and the default until they choose', () => {
    expect(chosenAccount('a2', accounts, 'a6')).toBe('a2')
    expect(chosenAccount(NEW_ACCOUNT, accounts)).toBe(NEW_ACCOUNT)
    expect(chosenAccount(null, accounts, 'a6')).toBe('a6')
    expect(chosenAccount(null, accounts)).toBe('')
  })

  it('goes back to the placeholder, never to another account, when the choice leaves the list', () => {
    expect(chosenAccount('a2', [{ id: 'a6' }], 'a6')).toBe('')
    expect(chosenAccount('a2', [])).toBe(NEW_ACCOUNT)
  })
})

describe('usernameStatus', () => {
  const now = { settled: true, hasError: false }

  it('says what the check found', () => {
    expect(usernameStatus('checking', now)).toEqual({ text: 'Checking…', warn: false })
    expect(usernameStatus('available', now)).toEqual({ text: 'Available', warn: false })
    expect(usernameStatus('taken', now)).toEqual({ text: 'That username is taken.', warn: true })
    expect(usernameStatus('invalid', now)).toEqual({
      text: 'Use 3 to 30 lowercase letters, numbers, dots or underscores.',
      warn: true,
    })
  })

  it('waits for a pause before the format message, and gives way to an error', () => {
    expect(usernameStatus('invalid', { settled: false, hasError: false })).toBeNull()
    expect(usernameStatus('taken', { settled: true, hasError: true })).toBeNull()
    expect(usernameStatus('empty', now)).toBeNull()
    expect(usernameStatus('unknown', now)).toBeNull()
  })
})
