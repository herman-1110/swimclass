import { describe, expect, it } from 'vitest'

import { approvedNotice, removeDescription, removeTitle, SIGN_UP_REMOVED } from './copy'

describe('the approval words', () => {
  it('announces an approval by name', () => {
    expect(approvedNotice('Siti Rahman')).toBe('Siti Rahman approved')
  })

  it('asks before removing a sign-up, naming the account', () => {
    expect(removeTitle('Siti Rahman')).toBe('Remove Siti Rahman’s sign-up?')
    expect(removeDescription('siti')).toBe('This deletes the account siti. They can sign up again.')
    expect(SIGN_UP_REMOVED).toBe('Sign-up removed')
  })
})
