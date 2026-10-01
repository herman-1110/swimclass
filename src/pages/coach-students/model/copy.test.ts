import { describe, expect, it } from 'vitest'

import { listAnnouncement, studentsAdded } from './copy'

describe('studentsAdded', () => {
  it('counts the students of the group just added', () => {
    expect(studentsAdded(1)).toBe('Student added')
    expect(studentsAdded(3)).toBe('3 students added')
  })
})

describe('listAnnouncement', () => {
  it('says how many packages or accounts the tab and search show', () => {
    expect(listAnnouncement('all', 13)).toBe('13 packages')
    expect(listAnnouncement('unpaid', 1)).toBe('1 package')
    expect(listAnnouncement('paid', 0)).toBe('No packages match')
    expect(listAnnouncement('waiting', 2)).toBe('2 accounts')
    expect(listAnnouncement('waiting', 0)).toBe('No accounts match')
  })
})
