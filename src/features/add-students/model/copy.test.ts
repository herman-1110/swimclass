import { describe, expect, it } from 'vitest'

import {
  accountCreatedNotice,
  packageLine,
  saveLabel,
  shareText,
  showsPreviewNote,
  studentPlaceholder,
  studentsPerLessonHelp,
  typeLabel,
  typeOptions,
} from './copy'

describe('Add students copy', () => {
  it('names the type and the button by the chosen type (AdminAddStudents.dc.html:174-178)', () => {
    expect(typeLabel(3)).toBe('1-to-3')
    expect(saveLabel(1)).toBe('Add student')
    expect(saveLabel(2)).toBe('Add 2 students')
    expect(saveLabel(3)).toBe('Add 3 students')
  })

  it('offers one segment per size up to the students per lesson', () => {
    expect(typeOptions(3)).toEqual([
      { value: '1', label: '1-to-1' },
      { value: '2', label: '1-to-2' },
      { value: '3', label: '1-to-3' },
    ])
    expect(typeOptions(1)).toEqual([{ value: '1', label: '1-to-1' }])
  })

  it('says how many students may share a lesson, from settings', () => {
    expect(studentsPerLessonHelp(3)).toBe('Up to 3 students from the same account per lesson.')
    expect(studentsPerLessonHelp(1)).toBe('Up to 1 student from the same account per lesson.')
  })

  it('explains sharing in the preview, as drawn', () => {
    expect(shareText(1)).toBe(
      'Books on their own. Each lesson uses 1 lesson from this student’s package.',
    )
    expect(shareText(2)).toBe(
      'They always book together, and each lesson uses 1 lesson from their shared package.',
    )
  })

  it('shows the preview note only when there is more than one student (C11)', () => {
    expect(showsPreviewNote(1)).toBe(false)
    expect(showsPreviewNote(2)).toBe(true)
    expect(showsPreviewNote(3)).toBe(true)
  })

  it('writes the package line with the price, or "price not set" (C6)', () => {
    expect(packageLine(3, 4, 54000)).toBe('1-to-3 package · 4 lessons · RM 540')
    expect(packageLine(1, 4, 24050)).toBe('1-to-1 package · 4 lessons · RM 240.50')
    expect(packageLine(1, 4, null)).toBe('1-to-1 package · 4 lessons · price not set')
    expect(packageLine(2, 1, null)).toBe('1-to-2 package · 1 lesson · price not set')
  })

  it('uses the drawn placeholders for the first three rows', () => {
    expect([1, 2, 3, 4].map(studentPlaceholder)).toEqual([
      'e.g. Adam',
      'e.g. Alya',
      'e.g. Amir',
      undefined,
    ])
  })

  it('tells the coach the account exists once it is made', () => {
    expect(accountCreatedNotice(' Siti Rahman ')).toBe('Account created for Siti Rahman.')
  })
})
