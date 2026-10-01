import { describe, expect, it } from 'vitest'

import { freeLessonHelp, notePlaceholder } from './copy'

describe('notePlaceholder', () => {
  it('suggests a note with the account holder’s name, as drawn', () => {
    expect(notePlaceholder('Farah')).toBe('e.g. Paid by Farah at the pool')
    expect(notePlaceholder(' Mei Ling ')).toBe('e.g. Paid by Mei Ling at the pool')
  })
})

describe('freeLessonHelp', () => {
  it('says what a free lesson adds, and to whose package', () => {
    expect(freeLessonHelp('Hana')).toBe('Adds 1 lesson at RM 0 to Hana’s package, dated today.')
    expect(freeLessonHelp('Adam, Alya & Amir')).toBe(
      'Adds 1 lesson at RM 0 to Adam, Alya & Amir’s package, dated today.',
    )
  })
})
