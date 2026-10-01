import { describe, expect, it } from 'vitest'

import { countFrom, groupChanges, groupDraft, groupErrorField } from './groupChanges'
import type { EditableGroup } from './types'

const hana: EditableGroup = {
  group_id: 'c3',
  display_names: 'Hana',
  size: 1,
  location: 'Sunrise Res.',
  opening_used_lessons: 20,
  opening_paid_lessons: 16,
  active: true,
}

describe('groupDraft', () => {
  it('starts from the group’s pool and starting balance', () => {
    expect(groupDraft(hana)).toEqual({ location: 'Sunrise Res.', usedText: '20', paidText: '16' })
  })
})

describe('countFrom', () => {
  it('reads digits, and empty as 0', () => {
    expect(countFrom('3')).toBe(3)
    expect(countFrom(' 05 ')).toBe(5)
    expect(countFrom('')).toBe(0)
  })

  it('gives null for a negative or broken count', () => {
    expect(countFrom('-1')).toBeNull()
    expect(countFrom('2.5')).toBeNull()
    expect(countFrom('two')).toBeNull()
  })
})

describe('groupChanges', () => {
  it('is null when nothing changed, so the dialog just closes', () => {
    expect(groupChanges(hana, groupDraft(hana))).toEqual({ changes: null })
    expect(groupChanges(hana, { ...groupDraft(hana), location: '  Sunrise Res. ' })).toEqual({
      changes: null,
    })
  })

  it('sends only what changed, the location trimmed', () => {
    expect(groupChanges(hana, { ...groupDraft(hana), location: ' Sunrise Residence ' })).toEqual({
      changes: { groupId: 'c3', location: 'Sunrise Residence' },
    })
    expect(groupChanges(hana, { location: 'Sunrise Res.', usedText: '3', paidText: '5' })).toEqual({
      changes: { groupId: 'c3', openingUsed: 3, openingPaid: 5 },
    })
  })

  it('sends a blank location, so the database answers with its own words', () => {
    expect(groupChanges(hana, { ...groupDraft(hana), location: '   ' })).toEqual({
      changes: { groupId: 'c3', location: '' },
    })
  })

  it('stops a count that isn’t 0 or more at its field', () => {
    expect(groupChanges(hana, { ...groupDraft(hana), usedText: '-1' })).toEqual({
      check: { field: 'used', code: 'invalid_opening' },
    })
    expect(groupChanges(hana, { ...groupDraft(hana), paidText: 'x' })).toEqual({
      check: { field: 'paid', code: 'invalid_opening' },
    })
  })
})

describe('groupErrorField', () => {
  it('puts a refusal at the field it is about, or above the buttons', () => {
    expect(groupErrorField('invalid_location')).toBe('location')
    expect(groupErrorField('invalid_opening')).toBe('used')
    expect(groupErrorField('not_found')).toBe('form')
  })
})
