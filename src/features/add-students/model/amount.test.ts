import { describe, expect, it } from 'vitest'

import { amountPrefill, lessonDigits, readAmount, readLessons } from './amount'

describe('readAmount', () => {
  it('reads ringgit as cents', () => {
    expect(readAmount('240')).toBe(24000)
    expect(readAmount('240.5')).toBe(24050)
    expect(readAmount('RM 1,200.50')).toBe(120050)
    expect(readAmount('0')).toBe(0)
  })

  it('gives null for an empty field: the database then uses the price', () => {
    expect(readAmount('')).toBeNull()
    expect(readAmount('  ')).toBeNull()
  })

  it('refuses text, more than two decimals, a negative amount and more than 7 digits', () => {
    expect(readAmount('12a')).toBe('invalid')
    expect(readAmount('240.555')).toBe('invalid')
    expect(readAmount('-240')).toBe('invalid')
    expect(readAmount('10000000')).toBe('invalid')
    expect(readAmount('9999999.99')).toBe(999_999_999)
  })
})

describe('amountPrefill', () => {
  it('starts at the type’s price, or empty while it isn’t set', () => {
    expect(amountPrefill(54000)).toBe('540')
    expect(amountPrefill(24050)).toBe('240.50')
    expect(amountPrefill(null)).toBe('')
  })
})

describe('starting balance fields', () => {
  it('keep digits only, at most 4', () => {
    expect(lessonDigits('2a')).toBe('2')
    expect(lessonDigits('-3')).toBe('3')
    expect(lessonDigits('123456')).toBe('1234')
  })

  it('count empty as 0', () => {
    expect(readLessons('')).toBe(0)
    expect(readLessons('6')).toBe(6)
  })
})
