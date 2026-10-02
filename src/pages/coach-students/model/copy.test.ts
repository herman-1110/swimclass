import { describe, expect, it } from 'vitest'

import { listAnnouncement, noMatchText, studentsAdded } from './copy'

describe('studentsAdded', () => {
  it('counts the students of the group just added', () => {
    expect(studentsAdded(1)).toBe('Student added.')
    expect(studentsAdded(3)).toBe('3 students added.')
    expect(studentsAdded(2, null)).toBe('2 students added.')
  })

  it('says whom a new account’s invite went to', () => {
    expect(studentsAdded(1, 'siti@example.com')).toBe(
      'Student added · Invite sent to siti@example.com.',
    )
    expect(studentsAdded(3, 'farah@example.com')).toBe(
      '3 students added · Invite sent to farah@example.com.',
    )
  })
})

describe('noMatchText', () => {
  it('quotes the search, for packages or for waiting accounts', () => {
    expect(noMatchText('unpaid', '  zz ')).toBe('No students match “zz”.')
    expect(noMatchText('waiting', 'zz')).toBe('No accounts match “zz”.')
  })
})

describe('listAnnouncement', () => {
  it('says how many packages or accounts the tab and search show', () => {
    expect(listAnnouncement('all', 13, false)).toBe('13 packages')
    expect(listAnnouncement('unpaid', 1, false)).toBe('1 package')
    expect(listAnnouncement('waiting', 2, false)).toBe('2 accounts')
  })

  it('says a search found nothing only when it matches nothing', () => {
    expect(listAnnouncement('paid', 0, true)).toBe('No packages match')
    expect(listAnnouncement('waiting', 0, true)).toBe('No accounts match')
  })

  it('uses the empty tab’s own words otherwise', () => {
    expect(listAnnouncement('unpaid', 0, false)).toBe('No unpaid packages.')
    expect(listAnnouncement('last-lesson', 0, false)).toBe('No one is on their last lesson.')
    expect(listAnnouncement('waiting', 0, false)).toBe('No accounts are waiting for approval.')
    expect(listAnnouncement('all', 0, false)).toBe('No students yet')
  })
})
